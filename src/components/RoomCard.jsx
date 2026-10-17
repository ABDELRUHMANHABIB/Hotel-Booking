import { Link } from "react-router-dom";
import { assets } from "../assets/assets";

function RoomCard({ room, featured = false }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Link
        to={`/rooms/${room._id}`}
        aria-label={`View details for ${room.hotel.name}, ${room.roomType}`}
        className="block"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={room.images[0]}
            alt={`${room.hotel.name}, ${room.roomType}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            {featured ? "Featured" : room.isAvailable ? "Available" : "Unavailable"}
          </span>
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
            <img
              src={assets.locationFilledIcon}
              alt=""
              aria-hidden="true"
              className="h-3.5 w-3.5"
            />
            <span>{room.hotel.city}</span>
          </div>
          <h2 className="truncate text-base font-semibold text-slate-900">
            {room.hotel.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{room.roomType}</p>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              <span className="text-lg font-semibold text-slate-900">
                ${room.pricePerNight}
              </span>{" "}
              / night
            </p>
            <span className="text-sm font-medium text-primary">
              View details
              <span aria-hidden="true" className="ml-1">
                →
              </span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default RoomCard;
