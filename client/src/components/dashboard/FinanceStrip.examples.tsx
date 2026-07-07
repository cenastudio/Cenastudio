import * as React from "react";
import { FinanceStrip } from "./FinanceStrip";

/**
 * FinanceStrip Component Examples
 *
 * Demonstrates various use cases and configurations of the FinanceStrip component
 */

export default function FinanceStripExamples() {
  const [clickCount, setClickCount] = React.useState(0);

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "2rem", fontSize: "2rem", fontWeight: "bold" }}>
        FinanceStrip Component Examples
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Example 1: Default usage */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            1. Default Usage
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Standard finance strip with typical monthly revenue and job count.
          </p>
          <FinanceStrip
            monthlyRevenue={12500.5}
            jobsCompleted={5}
          />
        </section>

        {/* Example 2: Zero revenue */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            2. Zero Revenue
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Display when no revenue has been generated this month.
          </p>
          <FinanceStrip
            monthlyRevenue={0}
            jobsCompleted={0}
          />
        </section>

        {/* Example 3: Large numbers */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            3. Large Revenue
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Display with high revenue and many completed jobs.
          </p>
          <FinanceStrip
            monthlyRevenue={125000.99}
            jobsCompleted={25}
          />
        </section>

        {/* Example 4: Single job */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            4. Single Job Completed
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Display with one completed job.
          </p>
          <FinanceStrip
            monthlyRevenue={5000}
            jobsCompleted={1}
          />
        </section>

        {/* Example 5: Custom callback */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            5. Custom Navigation Callback
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Using onViewFinance callback instead of default navigation. Clicked: {clickCount} times
          </p>
          <FinanceStrip
            monthlyRevenue={8500}
            jobsCompleted={7}
            onViewFinance={() => {
              setClickCount(prev => prev + 1);
              alert("Custom callback triggered! Count: " + (clickCount + 1));
            }}
          />
        </section>

        {/* Example 6: Custom className */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            6. Custom Styling
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Finance strip with custom background color.
          </p>
          <FinanceStrip
            monthlyRevenue={15000}
            jobsCompleted={10}
            className="custom-finance-strip"
          />
        </section>

        {/* Example 7: Very high revenue */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            7. Very High Revenue
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Display with millions in revenue.
          </p>
          <FinanceStrip
            monthlyRevenue={1500000}
            jobsCompleted={50}
          />
        </section>

        {/* Example 8: Small revenue */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            8. Small Revenue
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Display with minimal revenue and few jobs.
          </p>
          <FinanceStrip
            monthlyRevenue={150.5}
            jobsCompleted={1}
          />
        </section>

        {/* Example 9: Cents precision */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            9. Precise Cents
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Revenue with specific cent values.
          </p>
          <FinanceStrip
            monthlyRevenue={9876.54}
            jobsCompleted={12}
          />
        </section>

        {/* Example 10: Mobile simulation */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            10. Mobile View Simulation
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Narrow container to simulate mobile wrapping (resize your window to see wrapping).
          </p>
          <div style={{ maxWidth: "400px" }}>
            <FinanceStrip
              monthlyRevenue={25000}
              jobsCompleted={15}
            />
          </div>
        </section>

        {/* Example 11: Custom currency */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            11. Custom Currency (USD)
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Using USD instead of BRL (formatting will use USD locale).
          </p>
          <FinanceStrip
            monthlyRevenue={10000}
            jobsCompleted={8}
            currency="USD"
          />
        </section>

        {/* Example 12: In a darker container */}
        <section>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "600" }}>
            12. Dark Background
          </h2>
          <p style={{ marginBottom: "1rem", color: "#64748b" }}>
            Finance strip on a dark background to show glass effect.
          </p>
          <div style={{
            background: "#0f172a",
            padding: "2rem",
            borderRadius: "1rem"
          }}>
            <FinanceStrip
              monthlyRevenue={18500}
              jobsCompleted={9}
            />
          </div>
        </section>
      </div>

      <style>{`
        .custom-finance-strip {
          border: 2px solid #FF6B00;
        }
      `}</style>
    </div>
  );
}
