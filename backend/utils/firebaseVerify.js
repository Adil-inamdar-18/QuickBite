import jwt from "jsonwebtoken";
import https from "https";

let cachedCerts = null;
let certsExpiresAt = 0;

const fetchGoogleCerts = () => {
  return new Promise((resolve, reject) => {
    https
      .get(
        "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const certs = JSON.parse(data);
              const cacheControl = res.headers["cache-control"] || "";
              const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
              const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600 * 1000;
              cachedCerts = certs;
              certsExpiresAt = Date.now() + maxAge;
              resolve(certs);
            } catch (err) {
              reject(err);
            }
          });
        },
      )
      .on("error", reject);
  });
};

export const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken) {
    throw new Error("Firebase ID token is required for Google authentication");
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "quick-bite-food-delivery-4d415";
  const decodedHeader = jwt.decode(idToken, { complete: true });

  if (!decodedHeader?.header?.kid) {
    throw new Error("Invalid Firebase token header");
  }

  if (!cachedCerts || Date.now() >= certsExpiresAt) {
    await fetchGoogleCerts();
  }

  let cert = cachedCerts?.[decodedHeader.header.kid];
  if (!cert) {
    await fetchGoogleCerts();
    cert = cachedCerts?.[decodedHeader.header.kid];
  }

  if (!cert) {
    throw new Error("Unable to find matching Google public key");
  }

  const payload = jwt.verify(idToken, cert, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });

  if (!payload.email || !payload.email_verified) {
    throw new Error("Verified Google email is required");
  }

  return payload;
};
