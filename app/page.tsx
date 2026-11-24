"use client";
import dynamic from "next/dynamic";

const LegoScene = dynamic(() => import("@/components/lego/LegoScene"), {
  ssr: false,
});

export default function Home() {
  return <LegoScene />;
}
