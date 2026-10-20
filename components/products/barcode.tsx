"use client";
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/** Code-barres Code 128 en SVG (net à l'impression). */
export function Barcode({ value, height = 40, width = 1.6, fontSize = 12, displayValue = true }: { value: string; height?: number; width?: number; fontSize?: number; displayValue?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, value, { format: "CODE128", height, width, fontSize, margin: 0, displayValue, font: "Hanken Grotesk, sans-serif", background: "transparent" });
    } catch {
      ref.current.innerHTML = "";
    }
  }, [value, height, width, fontSize, displayValue]);
  return <svg ref={ref} role="img" aria-label={`Code-barres ${value}`} />;
}
