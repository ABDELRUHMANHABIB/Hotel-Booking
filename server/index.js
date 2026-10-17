import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { createClerkClient, verifyToken } from "@clerk/backend";
import Stripe from "stripe";
import { roomCatalog } from "./roomCatalog.js";
import { offerCatalog } from "./offerCatalog.js";

const port = Number(process.env.API_PORT || 4242);
const productionAppUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "";
const deploymentAppUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";
const defaultAppUrl = productionAppUrl || deploymentAppUrl || "http://localhost:5173";
const publicAppUrl = (process.env.PUBLIC_APP_URL || defaultAppUrl).replace(
  /\/$/,
  "",
);
const allowedAppOrigins = new Set(
  [publicAppUrl, productionAppUrl, deploymentAppUrl]
    .filter(Boolean)
    .map((appUrl) => new URL(appUrl).origin),
);
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const clerkClient = clerkSecretKey
  ? createClerkClient({ secretKey: clerkSecretKey })
  : null;
const stripe = stripeSecretKey?.startsWith("sk_test_")
  ? new Stripe(stripeSecretKey)
  : null;
const bookingsPath = resolve("server/data/bookings.json");
const subscribersPath = resolve("server/data/subscribers.json");
const roomsPath = resolve("server/data/rooms.json");
const maxBodySize = 16 * 1024;
const roomAmenities = new Set([
  "Free WiFi",
  "Free Breakfast",
  "Room Service",
  "Mountain View",
  "Pool Access",
]);
let bookingWriteQueue = Promise.resolve();
let subscriberWriteQueue = Promise.resolve();
let roomWriteQueue = Promise.resolve();
let roomInitialization;
let databaseInitialization;

const ensureDatabase = async () => {
  if (!sql) return;
  if (!databaseInitialization) {
    databaseInitialization = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS quickstay_rooms (
        id text PRIMARY KEY,
        position integer NOT NULL,
        room_data jsonb NOT NULL
      )`;
      await sql`CREATE TABLE IF NOT EXISTS quickstay_bookings (
        checkout_session_id text PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        booking_data jsonb NOT NULL
      )`;
      await sql`CREATE TABLE IF NOT EXISTS quickstay_subscribers (
        email text PRIMARY KEY,
        subscribed_at timestamptz NOT NULL DEFAULT now()
      )`;
      for (const [position, [_id, room]] of Object.entries(roomCatalog).entries()) {
        const roomData = {
          _id,
          ...room,
          isAvailable: true,
          isListed: true,
        };
        await sql`INSERT INTO quickstay_rooms (id, position, room_data)
          VALUES (${_id}, ${position}, ${JSON.stringify(roomData)}::jsonb)
          ON CONFLICT (id) DO NOTHING`;
      }
    })().catch((error) => {
      databaseInitialization = undefined;
      throw error;
    });
  }
  await databaseInitialization;
};

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
};

const readBody = (request) =>
  new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodySize) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks)));
    request.on("error", reject);
  });

const getBookings = async () => {
  if (sql) {
    await ensureDatabase();
    const rows = await sql`SELECT booking_data FROM quickstay_bookings ORDER BY created_at`;
    return rows.map((row) => row.booking_data);
  }
  try {
    const contents = await readFile(bookingsPath, "utf8");
    const bookings = JSON.parse(contents);
    if (!Array.isArray(bookings)) {
      throw new TypeError("The saved booking data is invalid.");
    }
    return bookings;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const getSubscribers = async () => {
  if (sql) {
    await ensureDatabase();
    const rows = await sql`SELECT email, subscribed_at FROM quickstay_subscribers ORDER BY subscribed_at`;
    return rows.map((row) => ({
      email: row.email,
      subscribedAt: new Date(row.subscribed_at).toISOString(),
    }));
  }
  try {
    const contents = await readFile(subscribersPath, "utf8");
    const subscribers = JSON.parse(contents);
    if (!Array.isArray(subscribers)) {
      throw new TypeError("The saved newsletter data is invalid.");
    }
    return subscribers;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const getRooms = async () => {
  if (sql) {
    await ensureDatabase();
    const rows = await sql`SELECT room_data FROM quickstay_rooms ORDER BY position, id`;
    return rows.map((row) => row.room_data);
  }
  if (!roomInitialization) {
    roomInitialization = (async () => {
      try {
        const rooms = JSON.parse(await readFile(roomsPath, "utf8"));
        if (!Array.isArray(rooms)) {
          throw new TypeError("The saved room data is invalid.");
        }
        return rooms;
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      const rooms = Object.entries(roomCatalog).map(([_id, room]) => ({
        _id,
        ...room,
        isAvailable: true,
        isListed: true,
      }));
      await mkdir(dirname(roomsPath), { recursive: true });
      await writeFile(roomsPath, JSON.stringify(rooms, null, 2));
      return rooms;
    })();
  }
  return roomInitialization;
};

const saveRooms = (update) => {
  if (sql) {
    const operation = roomWriteQueue.then(async () => {
      await ensureDatabase();
      const currentRooms = await getRooms();
      const nextRooms = await update(currentRooms);
      const statements = [
        sql`DELETE FROM quickstay_rooms`,
        ...nextRooms.map(
          (room, position) =>
            sql`INSERT INTO quickstay_rooms (id, position, room_data)
              VALUES (${room._id}, ${position}, ${JSON.stringify(room)}::jsonb)`,
        ),
      ];
      await sql.transaction(statements);
      return nextRooms;
    });
    roomWriteQueue = operation.catch((error) => {
      console.error("Failed to persist room changes.", error);
    });
    return operation;
  }
  const operation = roomWriteQueue.then(async () => {
    const rooms = await getRooms();
    const nextRooms = await update(rooms);
    const temporaryPath = `${roomsPath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(nextRooms, null, 2));
    await rename(temporaryPath, roomsPath);
    roomInitialization = Promise.resolve(nextRooms);
    return nextRooms;
  });
  roomWriteQueue = operation.catch((error) => {
    console.error("Failed to persist room changes.", error);
  });
  return operation;
};

const requireAdmin = async (request, response) => {
  if (!clerkSecretKey || !clerkClient) {
    sendJson(response, 503, {
      error: "Admin access is unavailable. Configure Clerk on the server.",
    });
    return false;
  }

  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!token) {
    sendJson(response, 401, { error: "Sign in to manage rooms." });
    return false;
  }

  let userId;
  try {
    const claims = await verifyToken(token, {
      secretKey: clerkSecretKey,
      authorizedParties: [publicAppUrl],
    });
    userId = claims.sub;
  } catch {
    sendJson(response, 401, { error: "Your session is invalid or expired." });
    return false;
  }

  if (!userId) {
    sendJson(response, 401, { error: "Your session is invalid or expired." });
    return false;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const role = user.publicMetadata?.role;
    if (role !== "admin" && role !== "hotelOwner") {
      sendJson(response, 403, {
        error: "Your account is not authorized to manage rooms.",
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("Could not verify the room manager's Clerk role.", error);
    sendJson(response, 502, {
      error: "Admin access could not be verified. Please try again.",
    });
    return false;
  }
};

const parseRoomPayload = (payload, { partial = false } = {}) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const fields = {};
  const stringFields = [
    ["hotelName", 80],
    ["roomType", 60],
    ["city", 60],
    ["address", 120],
  ];
  for (const [field, maxLength] of stringFields) {
    if (partial && !(field in payload)) continue;
    if (
      typeof payload[field] !== "string" ||
      !payload[field].trim() ||
      payload[field].trim().length > maxLength
    ) {
      return null;
    }
    fields[field] = payload[field].trim();
  }

  if (!partial || "pricePerNight" in payload) {
    const price = Number(payload.pricePerNight);
    if (!Number.isInteger(price) || price < 1 || price > 100_000) return null;
    fields.pricePerNight = price;
  }

  if (!partial || "imageIndex" in payload) {
    const imageIndex = Number(payload.imageIndex);
    if (!Number.isInteger(imageIndex) || imageIndex < 0 || imageIndex > 3) {
      return null;
    }
    fields.imageIndex = imageIndex;
  }

  if (!partial || "amenities" in payload) {
    if (
      !Array.isArray(payload.amenities) ||
      payload.amenities.length > 8 ||
      payload.amenities.some(
        (amenity) =>
          typeof amenity !== "string" ||
          !amenity.trim() ||
          !roomAmenities.has(amenity.trim()),
      )
    ) {
      return null;
    }
    fields.amenities = [...new Set(payload.amenities.map((item) => item.trim()))];
  }

  if ("isAvailable" in payload) {
    if (typeof payload.isAvailable !== "boolean") return null;
    fields.isAvailable = payload.isAvailable;
  }

  return fields;
};

const saveNewsletterSubscriber = (email) => {
  if (sql) {
    return (async () => {
      await ensureDatabase();
      const inserted = await sql`INSERT INTO quickstay_subscribers (email)
        VALUES (${email}) ON CONFLICT (email) DO NOTHING RETURNING email`;
      return inserted.length > 0;
    })();
  }
  const operation = subscriberWriteQueue.then(async () => {
    const subscribers = await getSubscribers();
    if (subscribers.some((subscriber) => subscriber.email === email)) {
      return false;
    }

    await mkdir(dirname(subscribersPath), { recursive: true });
    const temporaryPath = `${subscribersPath}.tmp`;
    await writeFile(
      temporaryPath,
      JSON.stringify(
        [...subscribers, { email, subscribedAt: new Date().toISOString() }],
        null,
        2,
      ),
    );
    await rename(temporaryPath, subscribersPath);
    return true;
  });

  subscriberWriteQueue = operation.catch((error) => {
    console.error("Failed to persist a newsletter subscription.", error);
  });
  return operation;
};

const savePaidBooking = (session) => {
  if (sql) {
    return (async () => {
      await ensureDatabase();
      const metadata = session.metadata || {};
      const offer = metadata.offerId ? offerCatalog[metadata.offerId] : null;
      const booking = {
        checkoutSessionId: session.id,
        paymentIntentId: session.payment_intent,
        roomId: metadata.roomId,
        hotelName: metadata.hotelName,
        roomType: metadata.roomType,
        checkIn: metadata.checkIn,
        checkOut: metadata.checkOut,
        guests: Number(metadata.guests),
        nights: Number(metadata.nights),
        totalPrice: session.amount_total / 100,
        originalPrice: Number(metadata.originalTotalCents) / 100,
        discountAmount:
          (Number(metadata.originalTotalCents) - session.amount_total) / 100,
        offerId: offer ? metadata.offerId : null,
        offerTitle: offer?.title ?? null,
        discountPercent: offer?.priceOff ?? 0,
        currency: session.currency,
        status: "paid",
        paidAt: new Date().toISOString(),
      };
      const inserted = await sql`INSERT INTO quickstay_bookings
        (checkout_session_id, booking_data)
        VALUES (${session.id}, ${JSON.stringify(booking)}::jsonb)
        ON CONFLICT (checkout_session_id) DO NOTHING
        RETURNING booking_data`;
      if (inserted.length > 0) return inserted[0].booking_data;
      const existing = await sql`SELECT booking_data FROM quickstay_bookings
        WHERE checkout_session_id = ${session.id}`;
      return existing[0].booking_data;
    })();
  }
  const operation = bookingWriteQueue.then(async () => {
    const bookings = await getBookings();
    if (bookings.some((booking) => booking.checkoutSessionId === session.id)) {
      return bookings.find((booking) => booking.checkoutSessionId === session.id);
    }

    const metadata = session.metadata || {};
    const offer = metadata.offerId ? offerCatalog[metadata.offerId] : null;
    const booking = {
      checkoutSessionId: session.id,
      paymentIntentId: session.payment_intent,
      roomId: metadata.roomId,
      hotelName: metadata.hotelName,
      roomType: metadata.roomType,
      checkIn: metadata.checkIn,
      checkOut: metadata.checkOut,
      guests: Number(metadata.guests),
      nights: Number(metadata.nights),
      totalPrice: session.amount_total / 100,
      originalPrice: Number(metadata.originalTotalCents) / 100,
      discountAmount:
        (Number(metadata.originalTotalCents) - session.amount_total) / 100,
      offerId: offer ? metadata.offerId : null,
      offerTitle: offer?.title ?? null,
      discountPercent: offer?.priceOff ?? 0,
      currency: session.currency,
      status: "paid",
      paidAt: new Date().toISOString(),
    };

    await mkdir(dirname(bookingsPath), { recursive: true });
    const temporaryPath = `${bookingsPath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify([...bookings, booking], null, 2));
    await rename(temporaryPath, bookingsPath);
    return booking;
  });

  bookingWriteQueue = operation.catch((error) => {
    console.error("Failed to persist a paid booking.", error);
  });
  return operation;
};

const parseDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
};

const isAllowedOrigin = (origin) => {
  if (!origin || allowedAppOrigins.has(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;

  try {
    const parsedOrigin = new URL(origin);
    return (
      parsedOrigin.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsedOrigin.hostname)
    );
  } catch {
    return false;
  }
};

const getStay = ({ checkIn, checkOut, guests }, { allowPastStart = false } = {}) => {
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);
  const guestCount = Number(guests);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (
    !start ||
    !end ||
    (!allowPastStart && start < today) ||
    end <= start ||
    !Number.isInteger(guestCount) ||
    guestCount < 1 ||
    guestCount > 4
  ) {
    return null;
  }

  return {
    guests: guestCount,
    nights: (end - start) / 86_400_000,
  };
};

const isQuickStayPayment = async (session) => {
  const roomId = session.metadata?.roomId;
  const rooms = await getRooms();
  const room = rooms.find((item) => item._id === roomId);
  const stay = getStay(session.metadata || {}, { allowPastStart: true });
  const offerId = session.metadata?.offerId;
  const offer = offerId ? offerCatalog[offerId] : null;
  const discountPercent = offer?.priceOff ?? 0;
  const metadataPrice = Number(session.metadata?.pricePerNight);
  const pricePerNight =
    Number.isInteger(metadataPrice) && metadataPrice > 0
      ? metadataPrice
      : roomCatalog[roomId]?.pricePerNight;
  const discountedNightCents = room
    ? Math.round(pricePerNight * 100 * (100 - discountPercent) / 100)
    : 0;
  const originalTotalCents = room && stay
    ? pricePerNight * stay.nights * 100
    : 0;
  const expectedTotalCents = room && stay
    ? discountedNightCents * stay.nights
    : 0;

  return Boolean(
    session.mode === "payment" &&
      session.payment_status === "paid" &&
      session.currency === "usd" &&
      room &&
      Number.isInteger(pricePerNight) &&
      stay &&
      (!offerId || offer) &&
      session.metadata?.originalTotalCents === String(originalTotalCents) &&
      session.amount_total === expectedTotalCents,
  );
};

const createCheckoutSession = async (request, response) => {
  if (!stripe) {
    sendJson(response, 503, {
      error: "Card payments are not configured. Add your Stripe test key to .env.",
    });
    return;
  }

  const origin = request.headers.origin;
  if (!isAllowedOrigin(origin)) {
    sendJson(response, 403, { error: "This checkout request is not allowed." });
    return;
  }

  let payload;
  try {
    payload = JSON.parse((await readBody(request)).toString("utf8"));
  } catch {
    sendJson(response, 400, { error: "The checkout request is invalid." });
    return;
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    sendJson(response, 400, { error: "The checkout request is invalid." });
    return;
  }

  let rooms;
  try {
    rooms = await getRooms();
  } catch (error) {
    console.error("Could not load rooms for checkout.", error);
    sendJson(response, 500, { error: "Room availability could not be checked." });
    return;
  }
  const room = rooms.find(
    (item) =>
      item._id === payload.roomId && item.isListed && item.isAvailable,
  );
  const offerId =
    payload.offerId === undefined ? null : String(payload.offerId);
  const offer = offerId ? offerCatalog[offerId] : null;
  const stay = getStay(payload);
  if (!room || !stay || (offerId && !offer)) {
    sendJson(response, 400, {
      error: "Choose a valid room, offer, stay dates, and guest count.",
    });
    return;
  }

  try {
    const discountPercent = offer?.priceOff ?? 0;
    const originalTotalCents = room.pricePerNight * stay.nights * 100;
    const discountedNightCents = Math.round(
      room.pricePerNight * 100 * (100 - discountPercent) / 100,
    );
    const totalCents = discountedNightCents * stay.nights;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: stay.nights,
          price_data: {
            currency: "usd",
            unit_amount: discountedNightCents,
            product_data: {
              name: `${room.hotelName} - ${room.roomType}${
                offer ? ` (${offer.priceOff}% offer)` : ""
              }`,
              description: `${stay.nights} ${
                stay.nights === 1 ? "night" : "nights"
              }, ${stay.guests} ${stay.guests === 1 ? "guest" : "guests"}`,
            },
          },
        },
      ],
      metadata: {
        roomId: payload.roomId,
        hotelName: room.hotelName,
        roomType: room.roomType,
        pricePerNight: String(room.pricePerNight),
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        guests: String(stay.guests),
        nights: String(stay.nights),
        originalTotalCents: String(originalTotalCents),
        ...(offer && {
          offerId,
          offerTitle: offer.title,
          discountPercent: String(offer.priceOff),
        }),
      },
      success_url: `${publicAppUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicAppUrl}/booking/cancelled?room_id=${encodeURIComponent(
        payload.roomId,
      )}`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }
    if (session.amount_total !== totalCents) {
      throw new Error("Stripe returned an unexpected checkout total.");
    }
    sendJson(response, 200, { checkoutUrl: session.url });
  } catch (error) {
    console.error("Stripe could not create a checkout session.", error);
    sendJson(response, 502, {
      error: "Secure checkout is temporarily unavailable. Please try again.",
    });
  }
};

const verifyCheckoutSession = async (url, response) => {
  if (!stripe) {
    sendJson(response, 503, {
      error: "Card payments are not configured. Add your Stripe test key to .env.",
    });
    return;
  }

  const sessionId = url.searchParams.get("session_id");
  if (!sessionId || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    sendJson(response, 400, { error: "The payment session is invalid." });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      sendJson(response, 409, {
        error: "Stripe has not confirmed payment for this booking yet.",
      });
      return;
    }
    if (!(await isQuickStayPayment(session))) {
      sendJson(response, 400, {
        error: "This payment does not match a valid QuickStay room booking.",
      });
      return;
    }

    const booking = await savePaidBooking(session);
    sendJson(response, 200, { booking });
  } catch (error) {
    console.error("Could not verify the Stripe checkout session.", error);
    sendJson(response, 502, {
      error: "We couldn't verify payment with Stripe. Please contact support.",
    });
  }
};

const handleWebhook = async (request, response) => {
  if (!stripe || !stripeWebhookSecret) {
    sendJson(response, 503, { error: "Stripe webhooks are not configured." });
    return;
  }

  let event;
  try {
    const rawBody = await readBody(request);
    event = stripe.webhooks.constructEvent(
      rawBody,
      request.headers["stripe-signature"],
      stripeWebhookSecret,
    );
  } catch {
    sendJson(response, 400, { error: "The Stripe webhook signature is invalid." });
    return;
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    try {
      if (!(await isQuickStayPayment(event.data.object))) {
        sendJson(response, 200, { received: true });
        return;
      }
      await savePaidBooking(event.data.object);
    } catch (error) {
      console.error("Could not store the paid Stripe booking.", error);
      sendJson(response, 500, { error: "The paid booking could not be saved." });
      return;
    }
  }

  sendJson(response, 200, { received: true });
};

const subscribeToNewsletter = async (request, response) => {
  if (!isAllowedOrigin(request.headers.origin)) {
    sendJson(response, 403, { error: "This subscription request is not allowed." });
    return;
  }

  let payload;
  try {
    payload = JSON.parse((await readBody(request)).toString("utf8"));
  } catch {
    sendJson(response, 400, { error: "The subscription request is invalid." });
    return;
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    sendJson(response, 400, { error: "The subscription request is invalid." });
    return;
  }

  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    sendJson(response, 400, { error: "Enter a valid email address." });
    return;
  }

  try {
    const subscribed = await saveNewsletterSubscriber(email);
    sendJson(response, subscribed ? 201 : 200, {
      subscribed: true,
      alreadySubscribed: !subscribed,
    });
  } catch (error) {
    console.error("Could not save the newsletter subscription.", error);
    sendJson(response, 500, {
      error: "We couldn't save your subscription. Please try again.",
    });
  }
};

const readJsonRequest = async (request, response, message) => {
  try {
    return JSON.parse((await readBody(request)).toString("utf8"));
  } catch {
    sendJson(response, 400, { error: message });
    return undefined;
  }
};

export const handleRequest = async (request, response) => {
  const origin = request.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    response.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS",
    );
  }

  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) {
      sendJson(response, 403, { error: "This request is not allowed." });
      return;
    }
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && url.pathname === "/api/rooms") {
    try {
      const rooms = await getRooms();
      sendJson(response, 200, {
        rooms: rooms.filter((room) => room.isListed),
      });
    } catch (error) {
      console.error("Could not load rooms.", error);
      sendJson(response, 500, { error: "Rooms could not be loaded." });
    }
    return;
  }

  if (url.pathname === "/api/admin/rooms") {
    if (!(await requireAdmin(request, response))) return;
    if (request.method === "GET") {
      try {
        const rooms = await getRooms();
        sendJson(response, 200, {
          rooms: rooms.filter((room) => room.isListed),
        });
      } catch (error) {
        console.error("Could not load admin rooms.", error);
        sendJson(response, 500, { error: "Rooms could not be loaded." });
      }
      return;
    }

    if (request.method === "POST") {
      if (!isAllowedOrigin(request.headers.origin)) {
        sendJson(response, 403, { error: "This room request is not allowed." });
        return;
      }
      const payload = await readJsonRequest(
        request,
        response,
        "The new room details are invalid.",
      );
      if (payload === undefined) return;
      const roomFields = parseRoomPayload(payload);
      if (!roomFields) {
        sendJson(response, 400, { error: "Enter valid details for every field." });
        return;
      }

      try {
        const room = {
          _id: randomUUID(),
          ...roomFields,
          isAvailable: true,
          isListed: true,
        };
        await saveRooms((rooms) => [...rooms, room]);
        sendJson(response, 201, { room });
      } catch (error) {
        console.error("Could not add the room.", error);
        sendJson(response, 500, { error: "The room could not be added." });
      }
      return;
    }
  }

  const adminRoomMatch = url.pathname.match(/^\/api\/admin\/rooms\/([^/]+)$/);
  if (adminRoomMatch && ["PATCH", "DELETE"].includes(request.method)) {
    if (!(await requireAdmin(request, response))) return;
    if (!isAllowedOrigin(request.headers.origin)) {
      sendJson(response, 403, { error: "This room request is not allowed." });
      return;
    }

    let roomId;
    try {
      roomId = decodeURIComponent(adminRoomMatch[1]);
    } catch {
      sendJson(response, 400, { error: "The room identifier is invalid." });
      return;
    }

    let changes = {};
    if (request.method === "PATCH") {
      const payload = await readJsonRequest(
        request,
        response,
        "The room update is invalid.",
      );
      if (payload === undefined) return;
      changes = parseRoomPayload(payload, { partial: true });
      if (!changes || Object.keys(changes).length === 0) {
        sendJson(response, 400, { error: "Enter valid details to update." });
        return;
      }
    }

    try {
      let updatedRoom;
      await saveRooms((rooms) => {
        const index = rooms.findIndex(
          (room) => room._id === roomId && room.isListed,
        );
        if (index === -1) return rooms;
        const nextRooms = [...rooms];
        if (request.method === "DELETE") {
          updatedRoom = { ...rooms[index], isListed: false, isAvailable: false };
        } else {
          updatedRoom = { ...rooms[index], ...changes };
        }
        nextRooms[index] = updatedRoom;
        return nextRooms;
      });
      if (!updatedRoom) {
        if (!response.writableEnded) {
          sendJson(response, 404, { error: "This room is no longer listed." });
        }
        return;
      }
      sendJson(response, 200, { room: updatedRoom });
    } catch (error) {
      console.error("Could not update the room.", error);
      if (!response.writableEnded) {
        sendJson(response, 500, { error: "The room could not be updated." });
      }
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      status: "ok",
      paymentsConfigured: Boolean(stripe),
    });
    return;
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/create-checkout-session"
  ) {
    await createCheckoutSession(request, response);
    return;
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/newsletter/subscribe"
  ) {
    await subscribeToNewsletter(request, response);
    return;
  }

  if (
    request.method === "GET" &&
    url.pathname === "/api/checkout-session"
  ) {
    await verifyCheckoutSession(url, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/stripe-webhook") {
    await handleWebhook(request, response);
    return;
  }

  sendJson(response, 404, { error: "API route not found." });
};

if (process.env.VERCEL !== "1") {
  const server = createServer(handleRequest);
  server.listen(port, () => {
    console.log(`QuickStay payment API listening on http://localhost:${port}`);
    if (!stripe) {
      console.warn(
        "Stripe test payments are not configured. Add an sk_test_ key to .env; live keys are disabled for the sample catalog.",
      );
    }
  });

  server.on("error", (error) => {
    console.error("QuickStay payment API failed to start.", error);
    process.exitCode = 1;
  });
}
