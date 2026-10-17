import { roomImages, roomsDummyData } from "../assets/assets";
import { apiUrl, isStaticDemo, readApiResponse } from "./api";

export const toRoomViewModel = (room) => {
  const imageIndex = Number.isInteger(room.imageIndex) ? room.imageIndex : 0;
  const hotelName = room.hotelName ?? room.hotel?.name;
  const city = room.city ?? room.hotel?.city;
  const address = room.address ?? room.hotel?.address;

  return {
    ...room,
    hotelName,
    city,
    address,
    hotel: {
      name: hotelName,
      city,
      address,
    },
    images: room.images ?? roomImages.map(
      (_, index) => roomImages[(index + imageIndex) % roomImages.length],
    ),
  };
};

export const fetchRooms = async (options = {}) => {
  if (isStaticDemo) {
    return roomsDummyData
      .filter((room) => room.isAvailable)
      .map(toRoomViewModel);
  }

  const response = await fetch(apiUrl("/api/rooms"), options);
  const result = await readApiResponse(response);
  if (!Array.isArray(result.rooms)) {
    throw new Error("The server returned invalid room data.");
  }
  return result.rooms.map(toRoomViewModel);
};
