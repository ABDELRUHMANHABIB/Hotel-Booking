export const isStaticDemo =
  import.meta.env.PROD && import.meta.env.BASE_URL === "/Hotel-Booking/";

export const readApiResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (isStaticDemo) {
      throw new Error(
        "This demo uses sample room data. Booking, subscriptions, and admin actions need the QuickStay API server.",
      );
    }
    throw new Error("The API returned an unexpected response. Please try again.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The API returned invalid data. Please try again.");
  }

  if (!response.ok) {
    throw new Error(result.error || "The request could not be completed.");
  }
  return result;
};
