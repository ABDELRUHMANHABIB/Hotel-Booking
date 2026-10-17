import Hero from "../components/Hero";
import FeaturedHotels from "../components/FeaturedHotels";
import ExclusiveOffers from "../components/ExclusiveOffers ";
import WhatOurGuests from "../components/WhatOurGuests";
import StayInspired from "../components/StayInspired";


function Home() {
  return (
    <div>
      <Hero/>
      <FeaturedHotels/>
      <ExclusiveOffers/>
      <WhatOurGuests/>
      <StayInspired/>
    </div>
  )
}

export default Home
