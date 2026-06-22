import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-6">
      <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
        <XCircle className="h-10 w-10 text-orange-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Payment Cancelled</h2>
        <p className="text-sm text-[#64748B] max-w-sm">
          You cancelled the payment. Your booking remains unchanged. You can try again from your bookings page.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/clients/bookings">Back to Bookings</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
