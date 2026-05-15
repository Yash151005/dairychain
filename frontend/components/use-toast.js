import { useEffect, useRef, useState } from "react";

export default function useToast(duration = 2400) {
  const [toast, setToast] = useState({ message: "", type: "info" });
  const timeoutRef = useRef(null);

  const showToast = (message, type = "info") => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast({ message, type });
    timeoutRef.current = setTimeout(() => {
      setToast({ message: "", type: "info" });
      timeoutRef.current = null;
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { toast, showToast };
}
