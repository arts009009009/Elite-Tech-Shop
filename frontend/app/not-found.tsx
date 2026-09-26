import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <h1 className="text-[72px] m-0 text-[#ff0040]" style={{ textShadow: "0 0 20px #ff0040" }}>
        404
      </h1>
      <p className="text-lg text-[#888] my-4">
        This page does not exist.
      </p>
      <Link
        href="/"
        className="px-8 py-3 text-sm border-2 border-[#00d4ff] text-[#00d4ff] no-underline rounded"
      >
        GO HOME
      </Link>
    </div>
  );
}
