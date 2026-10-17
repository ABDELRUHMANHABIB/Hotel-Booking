import { assets, testimonials } from "../assets/assets";

function WhatOurGuests() {
  return (
    <section className="bg-slate-50 px-5 py-16 sm:px-8 sm:py-20 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="mb-2 text-sm font-medium text-primary">
            Guest stories
          </p>
          <h2 className="font-playfair text-3xl font-semibold text-slate-900 sm:text-4xl">
            What Our Guests Say
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Real experiences from travelers who found their perfect stay with
            QuickStay.
          </p>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.id}
              className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="h-12 w-12 rounded-full object-cover"
                  loading="lazy"
                />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {testimonial.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {testimonial.address}
                  </p>
                </div>
              </div>

              <div
                className="mt-5 flex items-center gap-1"
                aria-label={`${testimonial.rating} out of 5 stars`}
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <img
                    key={index}
                    src={
                      index < testimonial.rating
                        ? assets.starIconFilled
                        : assets.starIconOutlined
                    }
                    alt=""
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                ))}
                <span className="ml-1 text-xs font-medium text-slate-600">
                  {testimonial.rating}.0
                </span>
              </div>

              <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">
                &ldquo;{testimonial.review}&rdquo;
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WhatOurGuests;
