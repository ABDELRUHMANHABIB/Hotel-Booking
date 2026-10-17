
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { useClerk, useUser, UserButton } from "@clerk/react";

const BookIcon = () => (
  <svg
    className="h-4 w-4 text-gray-700"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M5 19V4a1 1 0 0 1 1-1h12v14H7a2 2 0 0 0-2 2Zm0 0a2 2 0 0 0 2 2h12M9 3v14m7 0v4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Navbar = () => {
  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Hotels", path: "/rooms" },
    { name: "Experience", path: "/" },
    { name: "About", path: "/" },
  ];

  const [isPageScrolled, setIsPageScrolled] = useState(
    () => window.scrollY > 10,
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { openSignIn } = useClerk();
  const handleSignIn = () => {
    setIsMenuOpen(false);
    openSignIn({});
  };
  const { user } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isScrolled = pathname !== "/" || isPageScrolled;
  const canManageRooms = ["admin", "hotelOwner"].includes(
    user?.publicMetadata?.role,
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsPageScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 w-full flex items-center justify-between px-4 md:px-16 lg:px-24 xl:px-32 transition-all duration-500 z-50 ${isScrolled ? "bg-white/80 shadow-md text-gray-700 backdrop-blur-lg py-3 md:py-4" : "bg-transparent py-4 md:py-6"}`}
    >
      {/* Logo */}
      <Link to="/">
        <img
          src={assets.logo}
          alt="Logo"
          className={`h-9 ${isScrolled && "invert opacity-80"}`}
        />
      </Link>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-4 lg:gap-8">
        {navLinks.map((link, i) => (
          <a
            key={i}
            href={link.path}
            className={`group flex flex-col gap-0.5 ${isScrolled ? "text-gray-700" : "text-white"}`}
          >
            {link.name}
            <div
              className={`${isScrolled ? "bg-gray-700" : "bg-white"} h-0.5 w-0 group-hover:w-full transition-all duration-300`}
            />
          </a>
        ))}
        {canManageRooms && (
          <button
            className={`border px-4 py-1 text-sm font-light rounded-full cursor-pointer ${isScrolled ? "text-black" : "text-white"} transition-all`}
            onClick={() => navigate("/owner")}
          >
            Dashboard
          </button>
        )}
      </div>

      {/* Desktop Right */}
      <div className="hidden md:flex items-center gap-4">
        <img
          src={assets.searchIcon}
          alt="Search"
          className={`${isScrolled && "invert"} h-7 transition-all duration-500`}
        />
        {user ? (
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Action
                label="My Bookings"
                labelIcon={<BookIcon />}
                onClick={() => navigate("/my-bookings")}
              />
            </UserButton.MenuItems>
          </UserButton>
        ) : (
          <button
            onClick={handleSignIn}
            className={`px-8 py-2.5 rounded-full ml-4 transition-all duration-500 ${isScrolled ? "text-white bg-black" : "bg-white text-black"}`}
          >
            Login
          </button>
        )}
      </div>

      {/* Mobile Menu Button */}
 

      <div className="flex items-center gap-3 md:hidden">
             {user && <UserButton>
            <UserButton.MenuItems>
              <UserButton.Action
                label="My Bookings"
                labelIcon={<BookIcon />}
                onClick={() => navigate("/my-bookings")}
              />
            </UserButton.MenuItems>
          </UserButton>}
        <img
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          src={assets.menuIcon}
          alt="Menu"
          className={`${isScrolled && "invert"} h-4`}
        />
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 left-0 w-full h-screen bg-white text-base flex flex-col md:hidden items-center justify-center gap-6 font-medium text-gray-800 transition-all duration-500 ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <button
          className="absolute top-4 right-4"
          onClick={() => setIsMenuOpen(false)}
        >
          <img src={assets.closeIcon} alt="Close" className="h-6.5" />
        </button>

        {navLinks.map((link, i) => (
          <a key={i} href={link.path} onClick={() => setIsMenuOpen(false)}>
            {link.name}
          </a>
        ))}

        {canManageRooms && (
          <button
            className="border px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all"
            onClick={() => {
              setIsMenuOpen(false);
              navigate("/owner");
            }}
          >
            Dashboard
          </button>
        )}

        {!user && (
          <button
            onClick={handleSignIn}
            className="bg-black text-white px-8 py-2.5 rounded-full transition-all duration-500">
            Login
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
