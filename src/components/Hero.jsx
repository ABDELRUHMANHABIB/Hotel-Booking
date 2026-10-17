import heroImage from "../assets/heroImage.png";
import { assets } from "../assets/assets";

function Hero() {
  return (
    <section className="relative flex min-h-[700px] items-center overflow-hidden bg-slate-950 px-5 pb-16 pt-28 text-white sm:px-8 md:min-h-[760px] md:px-12 md:pt-32 lg:px-16">
      <img
        src={heroImage}
        alt="Resort with a pool at sunset"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/45" />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex rounded-full bg-sky-500/80 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white sm:text-xs">
            The Ultimate Hotel Experience
          </p>
          <h1 className="font-playfair max-w-3xl text-4xl font-semibold leading-[1.08] text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Discover Your Perfect
            <span className="block">Getaway Destination</span>
          </h1>
          <p className="mt-4 max-w-xl text-xs leading-relaxed text-white/90 sm:text-sm">
            Unparalleled luxury and comfort await at the world&apos;s most
            exclusive hotels and resorts. Start your journey today.
          </p>
        </div>

         <form
            onSubmit={(e) => e.preventDefault()}
            className='mt-8 flex w-fit max-w-full flex-col gap-4 rounded-lg bg-white px-6 py-4 text-gray-500 md:flex-row max-md:items-start max-md:mx-auto'
         >

            <div>
                <div className='flex items-center gap-2'>
                    <img src={assets.calenderIcon} alt="Calendar" className="h-4" />
                    <label htmlFor="destinationInput">Destination</label>
                </div>
                <input list='destinations' id="destinationInput" type="text" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none" placeholder="Type here" required />
            </div>

            <div>
                <div className='flex items-center gap-2'>
                    <img src={assets.calenderIcon} alt="Calendar" className="h-4" />
                    <label htmlFor="checkIn">Check in</label>
                </div>
                <input id="checkIn" type="date" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none" />
            </div>

            <div>
                <div className='flex items-center gap-2'>
                    <img src={assets.calenderIcon} alt="Calendar" className="h-4" />
                    <label htmlFor="checkOut">Check out</label>
                </div>
                <input id="checkOut" type="date" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none" />
            </div>

            <div className='flex md:flex-col max-md:gap-2 max-md:items-center'>
                <label htmlFor="guests">Guests</label>
                <input min={1} max={4} id="guests" type="number" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none  max-w-16" placeholder="0" />
            </div>

            <button className='flex items-center justify-center gap-1 rounded-md bg-black py-3 px-4 text-white my-auto cursor-pointer max-md:w-full max-md:py-1' >
                <img src={assets.searchIcon} alt="Search" className="h-7" />
                <span>Search</span>
            </button>
        </form>
      </div>
    </section>
  );
}

export default Hero;
