
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RoomCard from "./RoomCard";
import { fetchRooms } from "../utils/rooms";

function FeaturedHotels() {
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchRooms({ signal: controller.signal })
      .then(setRooms)
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="bg-slate-50 px-5 py-16 sm:px-8 sm:py-20 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-primary">
              Handpicked stays for you
            </p>
            <h2 className="font-playfair text-3xl font-semibold text-slate-900 sm:text-4xl">
              Featured Hotels
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Discover exceptional stays chosen for their comfort, location,
              and memorable experiences.
            </p>
          </div>
          <Link
            to="/rooms"
            className="shrink-0 text-sm font-medium text-primary transition-colors hover:text-blue-700"
          >
            Explore all hotels
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        </div>

        {error ? (
          <p role="alert" className="mt-8 text-sm text-red-700">
            {error}
          </p>
        ) : (
          <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {rooms.slice(0, 4).map((room) => (
              <RoomCard key={room._id} room={room} featured />
            ))}
          </div>
        )}
        <div className="mt-9 flex justify-center">
          <Link
            to="/rooms"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-6 py-3 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
          >
            View all rooms
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default FeaturedHotels;
