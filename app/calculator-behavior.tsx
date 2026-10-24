"use client";

import { useEffect } from "react";

export function CalculatorBehavior() {
  useEffect(() => {
    const form = document.getElementById("fare-form") as HTMLFormElement | null;
    const error = document.getElementById("calc-error");
    const result = document.getElementById("result");
    if (!form || !error || !result) return;

    const format = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 });
    const value = (name: string) => Number((form.elements.namedItem(name) as HTMLInputElement)?.value);
    const money = (amount: number) => "Rs " + format.format(amount);
    const setText = (id: string, text: string) => {
      const node = document.getElementById(id);
      if (node) node.textContent = text;
    };

    const calculate = (event?: Event) => {
      event?.preventDefault();
      error.hidden = true;
      const fare = value("fare");
      const pickup = value("pickup");
      const trip = value("trip");
      const average = value("average");
      const petrol = value("petrol");
      const commission = value("commission");
      const target = value("target");
      const minimum = value("minimum");
      const values = [fare, pickup, trip, average, petrol, commission, target, minimum];
      const valid = values.every(Number.isFinite)
        && fare > 0 && pickup >= 0 && trip > 0 && average > 0 && petrol > 0
        && commission >= 0 && commission < 100 && minimum > 0 && target >= minimum;

      if (!valid) {
        result.hidden = true;
        error.textContent = "Check the values. The target rate must be at least the minimum rate.";
        error.hidden = false;
        return;
      }

      const total = pickup + trip;
      const rate = fare / total;
      const fuelCost = total / average * petrol;
      const commissionCost = fare * commission / 100;
      const contribution = fare - fuelCost - commissionCost;
      let status: "green" | "yellow" | "red";
      let explanation: string;
      if (rate >= target) {
        status = "green";
        explanation = `The fare reaches ${money(target)}/km with pickup included.`;
      } else if (rate >= minimum) {
        status = "yellow";
        explanation = `The fare reaches your minimum gross rate, but is below your target of ${money(target)}/km.`;
      } else {
        status = "red";
        explanation = `The fare is below your minimum gross rate of ${money(minimum)}/km with pickup included.`;
      }
      result.hidden = false;
      result.dataset.status = status;
      setText("result-band", `${status.toUpperCase()} · GROSS RATE`);
      setText("total-distance", `${format.format(total)} km total driving`);
      setText("effective-rate", format.format(rate));
      setText("result-explanation", explanation);
      setText("fuel-cost", money(fuelCost));
      setText("commission-cost", money(commissionCost));
      setText("contribution", money(contribution));
    };

    form.addEventListener("submit", calculate);
    calculate();
    return () => form.removeEventListener("submit", calculate);
  }, []);

  return null;
}
