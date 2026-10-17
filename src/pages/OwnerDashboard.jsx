import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, useClerk, useUser, UserButton } from "@clerk/react";
import { assets, roomImages } from "../assets/assets";
import { readApiResponse } from "../utils/api";
import { toRoomViewModel } from "../utils/rooms";

const amenityOptions = [
  "Free WiFi",
  "Free Breakfast",
  "Room Service",
  "Mountain View",
  "Pool Access",
];

const emptyRoom = {
  hotelName: "",
  roomType: "Double Bed",
  city: "",
  address: "",
  pricePerNight: "",
  imageIndex: 0,
  amenities: ["Free WiFi", "Free Breakfast"],
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    bed: "M3 18v-7m0 4h18v-4a2 2 0 0 0-2-2h-5v6m-2 0V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4m0 4v3m18-3v3",
    plus: "M12 5v14m-7-7h14",
    search: "m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
    edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z",
    trash: "M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6",
    close: "M18 6 6 18M6 6l12 12",
    arrow: "M7 17 17 7M7 7h10v10",
  };
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function OwnerDashboard() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const { user } = useUser();
  const role = user?.publicMetadata?.role;
  const canManage = role === "admin" || role === "hotelOwner";
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalRoom, setModalRoom] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyRoomId, setBusyRoomId] = useState("");

  const apiRequest = useCallback(
    async (url, options = {}) => {
      const token = await getToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch(url, {
        ...options,
        headers: {
          ...(options.body && { "Content-Type": "application/json" }),
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
      return readApiResponse(response);
    },
    [getToken],
  );

  const loadRooms = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const result = await apiRequest("/api/admin/rooms");
      setRooms(result.rooms.map(toRoomViewModel));
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !canManage) return undefined;
    let isCurrent = true;
    apiRequest("/api/admin/rooms")
      .then((result) => {
        if (isCurrent) setRooms(result.rooms.map(toRoomViewModel));
      })
      .catch((error) => {
        if (isCurrent) setLoadError(error.message);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [apiRequest, canManage, isLoaded, isSignedIn]);

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "available" && room.isAvailable) ||
        (filter === "unavailable" && !room.isAvailable);
      const matchesSearch =
        !query ||
        `${room.hotelName} ${room.roomType} ${room.city}`
          .toLowerCase()
          .includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [filter, rooms, search]);

  const availableCount = rooms.filter((room) => room.isAvailable).length;
  const averagePrice = rooms.length
    ? Math.round(
        rooms.reduce((total, room) => total + room.pricePerNight, 0) /
          rooms.length,
      )
    : 0;

  const handleSaveRoom = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      hotelName: String(formData.get("hotelName")).trim(),
      roomType: String(formData.get("roomType")).trim(),
      city: String(formData.get("city")).trim(),
      address: String(formData.get("address")).trim(),
      pricePerNight: Number(formData.get("pricePerNight")),
      imageIndex: Number(formData.get("imageIndex")),
      amenities: formData.getAll("amenities").map(String),
    };
    setIsSaving(true);
    setActionError("");
    try {
      if (modalRoom?._id) {
        const result = await apiRequest(
          `/api/admin/rooms/${encodeURIComponent(modalRoom._id)}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        setRooms((current) =>
          current.map((room) =>
            room._id === result.room._id ? toRoomViewModel(result.room) : room,
          ),
        );
        setNotice("Room details updated.");
      } else {
        const result = await apiRequest("/api/admin/rooms", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setRooms((current) => [...current, toRoomViewModel(result.room)]);
        setNotice("New room added to your listings.");
      }
      setModalRoom(null);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAvailability = async (room) => {
    setBusyRoomId(room._id);
    setActionError("");
    try {
      const result = await apiRequest(
        `/api/admin/rooms/${encodeURIComponent(room._id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isAvailable: !room.isAvailable }),
        },
      );
      setRooms((current) =>
        current.map((item) =>
          item._id === result.room._id ? toRoomViewModel(result.room) : item,
        ),
      );
      setNotice(
        result.room.isAvailable
          ? "Room is now available to book."
          : "Room has been marked unavailable.",
      );
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusyRoomId("");
    }
  };

  const removeRoom = async (room) => {
    if (!window.confirm(`Remove ${room.hotelName} — ${room.roomType} from listings?`)) {
      return;
    }
    setBusyRoomId(room._id);
    setActionError("");
    try {
      await apiRequest(`/api/admin/rooms/${encodeURIComponent(room._id)}`, {
        method: "DELETE",
      });
      setRooms((current) => current.filter((item) => item._id !== room._id));
      setNotice("Room removed from public listings.");
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusyRoomId("");
    }
  };

  if (!isLoaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">
        Loading your dashboard...
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-5">
        <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <img src={assets.logo} alt="QuickStay" className="mx-auto h-9" />
          <h1 className="font-playfair mt-8 text-3xl font-semibold text-slate-900">
            Admin sign in
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Sign in with an authorized QuickStay account to manage room listings.
          </p>
          <button
            type="button"
            onClick={() => openSignIn({})}
            className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Sign in with Clerk
          </button>
          <Link
            to="/"
            className="mt-5 inline-flex text-sm font-medium text-slate-500 hover:text-primary"
          >
            Back to website
          </Link>
        </section>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-5">
        <section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-2xl text-amber-600">
            !
          </div>
          <h1 className="font-playfair mt-5 text-2xl font-semibold text-slate-900">
            Admin access required
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your signed-in account does not have permission to manage listings.
            Ask an administrator to assign the <code>admin</code> or{" "}
            <code>hotelOwner</code> role in Clerk.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to website
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <Link to="/" className="flex h-[76px] items-center border-b border-slate-100 px-7">
          <img src={assets.logo} alt="QuickStay" className="h-8" />
        </Link>
        <p className="px-7 pb-3 pt-8 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Workspace
        </p>
        <nav className="px-3">
          <a
            href="#overview"
            className="mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Icon name="grid" className="h-[18px] w-[18px]" />
            Overview
          </a>
          <a
            href="#rooms"
            className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-primary"
          >
            <Icon name="bed" className="h-[18px] w-[18px]" />
            Room listings
            <span className="ml-auto rounded-md bg-white px-2 py-0.5 text-xs text-primary">
              {rooms.length}
            </span>
          </a>
        </nav>
        <div className="mt-auto border-t border-slate-100 p-5">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-primary"
          >
            <Icon name="arrow" className="h-[18px] w-[18px]" />
            Visit website
          </Link>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <Link to="/" className="md:hidden">
              <img src={assets.logo} alt="QuickStay" className="h-7" />
            </Link>
            <span className="hidden text-sm text-slate-400 sm:inline">Admin</span>
            <span className="hidden text-slate-300 sm:inline">/</span>
            <span className="text-sm font-semibold text-slate-800">
              Room listings
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user.fullName || "QuickStay Admin"}
              </p>
              <p className="text-xs capitalize text-slate-400">{String(role)}</p>
            </div>
            <UserButton />
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <section id="overview" className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">QuickStay control center</p>
              <h1 className="font-playfair mt-1 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Good day{user.firstName ? `, ${user.firstName}` : ""}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Manage your rooms, pricing, and availability in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setModalRoom({ ...emptyRoom });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Icon name="plus" className="h-4 w-4" />
              Add a room
            </button>
          </section>

          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total rooms</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                    {rooms.length}
                  </p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-primary">
                  <Icon name="bed" />
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">Rooms in your public catalog</p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Available to book</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                    {availableCount}
                  </p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">Availability can be changed anytime</p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Average nightly rate</p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                    {formatCurrency(averagePrice)}
                  </p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
                  <span className="text-lg font-semibold">$</span>
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">Across all listed rooms</p>
            </article>
          </section>

          <section id="rooms" className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Your rooms</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review listings and keep availability up to date.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative block sm:w-64">
                  <span className="sr-only">Search rooms</span>
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search rooms..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label>
                  <span className="sr-only">Filter by availability</span>
                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary sm:w-auto"
                  >
                    <option value="all">All rooms</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </label>
              </div>
            </div>

            {(actionError || notice || loadError) && (
              <div className="space-y-2 px-5 pt-4 sm:px-6">
                {loadError && (
                  <div role="alert" className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span>{loadError}</span>
                    <button type="button" onClick={loadRooms} className="font-semibold underline">
                      Try again
                    </button>
                  </div>
                )}
                {actionError && (
                  <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {actionError}
                  </p>
                )}
                {notice && !actionError && !loadError && (
                  <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {notice}
                  </p>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">
                Loading room listings...
              </div>
            ) : rooms.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-primary">
                  <Icon name="bed" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">No rooms yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Add your first room to start building your catalog.
                </p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-slate-500">
                No rooms match your search.
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100 md:hidden">
                  {filteredRooms.map((room) => (
                    <article key={room._id} className="p-4">
                      <div className="flex gap-3">
                        <img
                          src={room.images[0]}
                          alt=""
                          className="h-[76px] w-[88px] shrink-0 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-slate-900">
                                {room.hotelName}
                              </h3>
                              <p className="mt-1 truncate text-xs text-slate-500">
                                {room.roomType} · {room.city}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-slate-900">
                              {formatCurrency(room.pricePerNight)}
                            </span>
                          </div>
                          <span
                            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              room.isAvailable
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {room.isAvailable ? "Available" : "Unavailable"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={busyRoomId === room._id}
                          onClick={() => toggleAvailability(room)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 disabled:opacity-50"
                        >
                          {room.isAvailable ? "Mark unavailable" : "Make available"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActionError("");
                            setModalRoom(room);
                          }}
                          aria-label={`Edit ${room.hotelName}`}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:text-primary"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busyRoomId === room._id}
                          onClick={() => removeRoom(room)}
                          aria-label={`Remove ${room.hotelName}`}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-600 disabled:opacity-50"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[780px] text-left">
                    <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-6 py-4">Room</th>
                        <th className="px-5 py-4">Location</th>
                        <th className="px-5 py-4">Nightly rate</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRooms.map((room) => (
                        <tr key={room._id} className="transition hover:bg-slate-50/70">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={room.images[0]}
                                alt=""
                                className="h-12 w-14 rounded-lg object-cover"
                              />
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {room.hotelName}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">{room.roomType}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">{room.city}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                            {formatCurrency(room.pricePerNight)}
                            <span className="ml-1 font-normal text-slate-400">/ night</span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium ${
                                room.isAvailable
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {room.isAvailable ? "Available" : "Unavailable"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={busyRoomId === room._id}
                                onClick={() => toggleAvailability(room)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-primary hover:text-primary disabled:opacity-50"
                              >
                                {room.isAvailable ? "Pause" : "Activate"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActionError("");
                                  setModalRoom(room);
                                }}
                                aria-label={`Edit ${room.hotelName}`}
                                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-primary"
                              >
                                <Icon name="edit" className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={busyRoomId === room._id}
                                onClick={() => removeRoom(room)}
                                aria-label={`Remove ${room.hotelName}`}
                                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              >
                                <Icon name="trash" className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400 sm:px-6">
                  Showing {filteredRooms.length} of {rooms.length} rooms
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      {modalRoom && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) setModalRoom(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-form-title"
            className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Room details
                </p>
                <h2 id="room-form-title" className="mt-1 text-xl font-semibold text-slate-900">
                  {modalRoom._id ? "Edit listing" : "Add a new room"}
                </h2>
              </div>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setModalRoom(null)}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-6 px-5 py-6 sm:px-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Hotel or property name
                  <input
                    name="hotelName"
                    required
                    maxLength={80}
                    defaultValue={modalRoom.hotelName || ""}
                    placeholder="e.g. Urbanza Suites"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Room type
                  <input
                    name="roomType"
                    required
                    maxLength={60}
                    defaultValue={modalRoom.roomType || "Double Bed"}
                    placeholder="e.g. Double Bed"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  City
                  <input
                    name="city"
                    required
                    maxLength={60}
                    defaultValue={modalRoom.city || ""}
                    placeholder="e.g. New York"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Price per night (USD)
                  <input
                    name="pricePerNight"
                    type="number"
                    required
                    min="1"
                    max="100000"
                    step="1"
                    defaultValue={modalRoom.pricePerNight ?? ""}
                    placeholder="249"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                  Street address
                  <input
                    name="address"
                    required
                    maxLength={120}
                    defaultValue={modalRoom.address || ""}
                    placeholder="Street, neighborhood"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-slate-700">
                  Choose a cover photo
                </legend>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {roomImages.map((image, index) => (
                    <label key={image} className="cursor-pointer">
                      <input
                        type="radio"
                        name="imageIndex"
                        value={index}
                        defaultChecked={Number(modalRoom.imageIndex || 0) === index}
                        className="peer sr-only"
                      />
                      <img
                        src={image}
                        alt={`Room photo option ${index + 1}`}
                        className="aspect-[4/3] w-full rounded-xl object-cover ring-2 ring-transparent ring-offset-2 transition peer-checked:ring-primary"
                      />
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Amenities</legend>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {amenityOptions.map((amenity) => (
                    <label
                      key={amenity}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-600 transition has-[:checked]:border-blue-300 has-[:checked]:bg-blue-50 has-[:checked]:text-slate-800"
                    >
                      <input
                        type="checkbox"
                        name="amenities"
                        value={amenity}
                        defaultChecked={(modalRoom.amenities || []).includes(amenity)}
                        className="h-4 w-4 accent-primary"
                      />
                      {amenity}
                    </label>
                  ))}
                </div>
              </fieldset>

              {actionError && (
                <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setModalRoom(null)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving
                    ? "Saving..."
                    : modalRoom._id
                      ? "Save changes"
                      : "Add room"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default OwnerDashboard;
