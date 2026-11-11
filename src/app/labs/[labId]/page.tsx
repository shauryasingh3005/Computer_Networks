import { Suspense } from "react";
import { notFound } from "next/navigation";
import LabRunner from "../lab-runner";

const labIds = ["1", "2", "3", "4"];

export function generateStaticParams() {
  return labIds.map((labId) => ({ labId }));
}

export default function LabPage({ params }: { params: Promise<{ labId: string }> }) {
  return <Suspense fallback={<div className="lab-loading">Loading guided lab...</div>}><LabContent params={params} /></Suspense>;
}

async function LabContent({ params }: { params: Promise<{ labId: string }> }) {
  const { labId } = await params;
  if (!labIds.includes(labId)) notFound();
  return <LabRunner labId={labId} />;
}