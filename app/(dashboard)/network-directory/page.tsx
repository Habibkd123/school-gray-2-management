"use client";

import { useAuth } from "../../context/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import NetworkDirectoryClient from "./NetworkDirectoryClient";

export default function NetworkDirectoryPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "super_admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (!user || user.role !== "super_admin") {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <NetworkDirectoryClient user={user} />
    </div>
  );
}
