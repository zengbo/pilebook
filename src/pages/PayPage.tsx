import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { Button, ErrorNote, Input, Label } from "../components/ui";
import { formatUsd } from "../shared/money";

type PaymentView = {
  id: string;
  amountCents: number;
  kind: string;
  status: string;
  provider: string;
  businessName: string;
  brandColor: string;
  publicToken: string;
  slug: string;
  label: string;
};

export function PayPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [number, setNumber] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12 / 30");
  const [cvc, setCvc] = useState("123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ payment: PaymentView }>(`/api/public/payments/${id}`)
      .then((data) => setPayment(data.payment))
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not open checkout."));
  }, [id]);

  async function pay(event: FormEvent) {
    event.preventDefault();
    const digits = number.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) {
      setError("Enter a card number. The demo accepts 4242 4242 4242 4242.");
      return;
    }
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(exp) || cvc.replace(/\D/g, "").length < 3) {
      setError("Check the expiration and CVC.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api<{ confirmationPath: string }>(`/api/public/payments/${id}/complete`, { method: "POST", body: "{}" });
      navigate(data.confirmationPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment did not go through.");
      setBusy(false);
    }
  }

  if (!payment) return <div className="pile-bg min-h-screen px-5 py-16">{error ? <ErrorNote>{error}</ErrorNote> : <p className="text-muted">Opening checkout…</p>}</div>;

  return (
    <div className="pile-bg min-h-screen px-4 py-10">
      <form onSubmit={(event) => void pay(event)} className="mx-auto max-w-md rounded-3xl border border-line bg-card p-6">
        <p className="text-sm text-muted">{payment.businessName}</p>
        <h1 className="display mt-1 text-4xl">{formatUsd(payment.amountCents)}</h1>
        <p className="mt-1 text-sm text-muted">{payment.kind === "balance" ? "Remaining balance" : payment.kind === "full" ? "Full payment" : "Deposit"}</p>
        {payment.status === "paid" ? <p className="mt-4 text-sm">This payment is already recorded.</p> : null}
        {payment.provider !== "mock" ? <p className="mt-4 text-sm">This payment is waiting on Stripe, not the demo card form.</p> : null}
        {payment.provider === "mock" && payment.status !== "paid" ? (
          <>
            <p className="mt-4 rounded-2xl bg-foam px-3 py-2 text-sm text-pine-deep">Simulated card payment. The number never leaves this browser.</p>
            <div className="mt-4">
              <Label htmlFor="card">Card number</Label>
              <Input id="card" inputMode="numeric" autoComplete="off" value={number} onChange={(event) => setNumber(event.target.value)} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><Label htmlFor="exp">Expiration</Label><Input id="exp" value={exp} onChange={(event) => setExp(event.target.value)} /></div>
              <div><Label htmlFor="cvc">CVC</Label><Input id="cvc" value={cvc} onChange={(event) => setCvc(event.target.value)} /></div>
            </div>
            {error ? <div className="mt-4"><ErrorNote>{error}</ErrorNote></div> : null}
            <Button className="mt-5 w-full" disabled={busy}>{busy ? "Recording payment…" : `Pay ${formatUsd(payment.amountCents)}`}</Button>
          </>
        ) : (
          <Button type="button" className="mt-5 w-full" onClick={() => navigate(`/b/${payment.slug}/confirmed/${payment.publicToken}`)}>View booking</Button>
        )}
      </form>
    </div>
  );
}
