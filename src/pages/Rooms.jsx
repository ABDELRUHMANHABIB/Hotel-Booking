import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RoomCard from "../components/RoomCard";
import { fetchRooms } from "../utils/rooms";

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchRooms({ signal: controller.signal })
      .then(setRooms)
      .catch((loadError) => {
        if (loadError.name !== "AbortError") {
          setError(loadError.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="bg-slate-50 px-5 pb-16 pt-28 sm:px-8 sm:pt-32 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-primary"
        >
          <span aria-hidden="true">←</span> Back to home
        </Link>
        <p className="text-sm font-medium text-primary">Find your next stay</p>
        <h1 className="font-playfair mt-1 text-3xl font-semibold text-slate-900 sm:text-4xl">
          All Rooms
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Browse available rooms and choose the stay that works for you. Select
          a room to see its photos, amenities, and booking options.
        </p>

        <p className="mt-6 text-sm text-slate-500">
          {isLoading ? "Loading rooms..." : `${rooms.length} rooms currently listed`}
        </p>
        {error ? (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {rooms.map((room) => (
              <RoomCard key={room._id} room={room} />
            ))}
          </div>
        )}
        {!isLoading && !error && rooms.length === 0 && (
          <p className="mt-5 rounded-xl bg-white p-6 text-sm text-slate-500">
            There are no rooms listed right now.
          </p>
        )}
      </div>
    </main>
  );
}

export default Rooms;
