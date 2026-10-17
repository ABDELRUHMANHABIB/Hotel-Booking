import { Link } from "react-router-dom";
import { assets } from "../assets/assets";

const socialLinks = [
  { name: "Facebook", image: assets.facebookIcon, url: "https://www.facebook.com/" },
  { name: "Instagram", image: assets.instagramIcon, url: "https://www.instagram.com/" },
  { name: "X", image: assets.twitterIcon, url: "https://x.com/" },
  { name: "LinkedIn", image: assets.linkendinIcon, url: "https://www.linkedin.com/" },
];

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-5 pb-6 pt-12 sm:px-8 sm:pt-14 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link to="/" aria-label="QuickStay home" className="inline-flex">
              <img
                src={assets.logo}
                alt="QuickStay"
                className="h-8 invert opacity-80"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
              Find a stay that feels just right. Discover handpicked hotels and
              make your next trip one to remember.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Visit ${social.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 transition hover:border-primary hover:bg-blue-50"
                >
                  <img
                    src={social.image}
                    alt=""
                    aria-hidden="true"
                    className="h-4 w-4"
                  />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">Explore</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-500">
              <li>
                <Link to="/" className="transition hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/rooms" className="transition hover:text-primary">
                  Browse hotels
                </Link>
              </li>
              <li>
                <Link to="/offers/1" className="transition hover:text-primary">
                  Special offers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Stay inspired
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Get travel ideas, handpicked stays, and offers in your inbox.
            </p>
            <Link
              to="/#newsletter-email"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:text-blue-700"
            >
              Join our newsletter
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} QuickStay. All rights reserved.
          </p>
          <p>Made for stays worth remembering.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
