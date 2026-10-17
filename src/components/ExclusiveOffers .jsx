

import { Link } from "react-router-dom";
import { exclusiveOffers } from "../assets/assets";

function ExclusiveOffers () {
  return (
    <section className="bg-white px-5 py-16 sm:px-8 sm:py-20 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium text-primary">
              Make your next trip even more rewarding
            </p>
            <h2 className="font-playfair text-3xl font-semibold text-slate-900 sm:text-4xl">
              Exclusive Offers
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
              Enjoy special savings and thoughtful extras on your next stay.
              Find the offer that makes your getaway unforgettable.
            </p>
          </div>
          <Link
            to="/rooms"
            className="shrink-0 text-sm font-medium text-primary transition-colors hover:text-blue-700"
          >
            Explore all rooms
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-3">
          {exclusiveOffers.map((offer) => (
            <article
              key={offer._id}
              className="group relative isolate min-h-[340px] overflow-hidden rounded-2xl bg-slate-900 shadow-sm"
            >
              <img
                src={offer.image}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/10" />

              <div className="absolute right-4 top-4 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm">
                Save {offer.priceOff}%
              </div>

              <div className="flex min-h-[340px] flex-col justify-end p-5 text-white sm:p-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/80">
                  Limited-time offer
                </p>
                <h3 className="font-playfair text-2xl font-semibold leading-tight">
                  {offer.title}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-white/85">
                  {offer.description}
                </p>
                <Link
                  to={`/offers/${offer._id}`}
                  className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-blue-50"
                >
                  View Offer
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ExclusiveOffers 
