import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { apiUrl, readApiResponse } from "../utils/api";

function BookingResult() {
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const sessionId = searchParams.get("session_id");
  const roomId = searchParams.get("room_id");
  const cancelled = pathname.endsWith("/cancelled");
  const [result, setResult] = useState({
    loading: Boolean(!cancelled && sessionId),
    booking: null,
    error: "",
  });

  useEffect(() => {
    if (cancelled || !sessionId) return undefined;

    const controller = new AbortController();
    fetch(
      apiUrl(`/api/checkout-session?session_id=${encodeURIComponent(sessionId)}`),
      { signal: controller.signal },
    )
      .then(readApiResponse)
      .then((data) => {
        setResult({ loading: false, booking: data.booking, error: "" });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setResult({ loading: false, booking: null, error: error.message });
        }
      });

    return () => controller.abort();
  }, [cancelled, sessionId]);

  let title = "Checking your payment...";
  let description = "Please wait while we confirm the payment with Stripe.";
  const resultError =
    result.error ||
    (!cancelled && !sessionId
      ? "The payment session could not be found."
      : "");

  if (cancelled) {
    title = "Payment cancelled";
    description =
      "No payment was taken. You can return to the room and try again.";
  } else if (!result.loading && result.booking) {
    title = "Booking confirmed";
    description = "Your card payment was successful and your room is booked.";
  } else if (!result.loading && resultError) {
    title = "We couldn't confirm the booking";
    description = resultError;
  }

  return (
    <main className="bg-slate-50 px-5 pb-16 pt-32 sm:px-8 lg:px-16">
      <section className="mx-auto max-w-xl rounded-2xl bg-white p-7 text-center shadow-sm sm:p-10">
        <div
          aria-hidden="true"
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl font-semibold ${
            result.booking
              ? "bg-green-100 text-green-700"
              : cancelled || resultError
                ? "bg-amber-100 text-amber-700"
                : "bg-blue-100 text-primary"
          }`}
        >
          {result.booking ? "✓" : cancelled || resultError ? "!" : "…"}
        </div>
        <h1 className="font-playfair mt-5 text-3xl font-semibold text-slate-900">
          {title}
        </h1>
        <p className="mt-3 leading-6 text-slate-600">{description}</p>

        {result.booking && (
          <dl className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Room</dt>
              <dd className="text-right font-medium text-slate-900">
                {result.booking.roomType} · {result.booking.hotelName}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Stay</dt>
              <dd className="text-right font-medium text-slate-900">
                {result.booking.checkIn} – {result.booking.checkOut}
              </dd>
            </div>
            {result.booking.offerTitle && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">
                    {result.booking.offerTitle} (
                    {result.booking.discountPercent}% off)
                  </dt>
                  <dd className="font-medium text-green-700">
                    −${result.booking.discountAmount.toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Price before offer</dt>
                  <dd className="font-medium text-slate-900">
                    ${result.booking.originalPrice.toFixed(2)}
                  </dd>
                </div>
              </>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">
                {result.booking.offerTitle ? "Total after offer" : "Total paid"}
              </dt>
              <dd className="font-semibold text-slate-900">
                ${result.booking.totalPrice}
              </dd>
            </div>
          </dl>
        )}

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {cancelled && roomId && (
            <Link
              to={`/rooms/${roomId}`}
              className="inline-flex justify-center rounded-lg bg-primary px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              Try booking again
            </Link>
          )}
          <Link
            to="/rooms"
            className="inline-flex justify-center rounded-lg border border-slate-200 px-5 py-3 font-medium text-slate-700 transition hover:border-primary hover:text-primary"
          >
            Browse rooms
          </Link>
        </div>
      </section>
    </main>
  );
}

export default BookingResult;
