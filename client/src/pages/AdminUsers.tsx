import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AdminUsers() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/admin"); }, []);
  return null;
}
