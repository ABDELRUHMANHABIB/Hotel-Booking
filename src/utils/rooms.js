import { roomImages } from "../assets/assets";

export const toRoomViewModel = (room) => {
  const imageIndex = Number.isInteger(room.imageIndex) ? room.imageIndex : 0;

  return {
    ...room,
    hotel: {
      name: room.hotelName,
      city: room.city,
      address: room.address,
    },
    images: roomImages.map(
      (_, index) => roomImages[(index + imageIndex) % roomImages.length],
    ),
  };
};

export const fetchRooms = async (options = {}) => {
  const response = await fetch("/api/rooms", options);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Rooms could not be loaded.");
  }
  if (!Array.isArray(result.rooms)) {
    throw new Error("The server returned invalid room data.");
  }
  return result.rooms.map(toRoomViewModel);
};
