import React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import scooter from "../assets/scooter.png";
import home from "../assets/home.png";
import shopIconImg from "../assets/shop.png";

const deliveryBoyIcon = new L.Icon({
  iconUrl: scooter,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -32],
});

const customerIcon = new L.Icon({
  iconUrl: home,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -32],
});

const restaurantIcon = new L.Icon({
  iconUrl: shopIconImg,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -32],
});

function DeliveryBoyTracking({ data }) {
  const deliveryBoyLat = data.deliveryBoyLocation?.lat;
  const deliveryBoyLon = data.deliveryBoyLocation?.lon;
  const customerLat = data.customerLocation?.lat;
  const customerLon = data.customerLocation?.lon;
  const shopLat = data.shopLocation?.lat;
  const shopLon = data.shopLocation?.lon;

  if (!deliveryBoyLat || !deliveryBoyLon || !customerLat || !customerLon) {
    return (
      <div className="w-full h-80 rounded-2xl bg-slate-100 flex items-center justify-center text-xs text-slate-500">
        GPS coordinates unavailable for live map
      </div>
    );
  }

  const positions = [];
  if (shopLat && shopLon) positions.push([shopLat, shopLon]);
  positions.push([deliveryBoyLat, deliveryBoyLon]);
  positions.push([customerLat, customerLon]);

  const center = [deliveryBoyLat, deliveryBoyLon];

  return (
    <div className="w-full h-88 rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xs">
      <MapContainer className="w-full h-full" center={center} zoom={15}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {shopLat && shopLon && (
          <Marker position={[shopLat, shopLon]} icon={restaurantIcon}>
            <Popup>Restaurant Pickup</Popup>
          </Marker>
        )}

        <Marker position={[deliveryBoyLat, deliveryBoyLon]} icon={deliveryBoyIcon}>
          <Popup>Delivery Partner (Live)</Popup>
        </Marker>

        <Marker position={[customerLat, customerLon]} icon={customerIcon}>
          <Popup>Customer Delivery Address</Popup>
        </Marker>

        <Polyline
          positions={
            shopLat && shopLon
              ? [
                  [shopLat, shopLon],
                  [deliveryBoyLat, deliveryBoyLon],
                  [customerLat, customerLon],
                ]
              : [
                  [deliveryBoyLat, deliveryBoyLon],
                  [customerLat, customerLon],
                ]
          }
          color="#FF4D2D"
          weight={4}
          dashArray="6, 8"
        />
      </MapContainer>
    </div>
  );
}

export default DeliveryBoyTracking;
