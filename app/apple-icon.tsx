import { ImageResponse } from "next/og";

export const size = { height: 180, width: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#F5F1E8",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <svg height="146" viewBox="0 0 64 64" width="146" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 6H18V44H14V58H8V6Z" fill="#17382D" />
          <path d="M18 18L46 39V49L18 28V18Z" fill="#17382D" />
          <path d="M46 6H56V58H46V6Z" fill="#17382D" />
          <path d="M15 45H18V58H15V45Z" fill="#E8672E" />
        </svg>
      </div>
    ),
    size,
  );
}
