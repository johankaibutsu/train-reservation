"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

interface Seat {
  id: number;
  row: number;
  number: number;
  isBooked: boolean;
  userId: string | null;
}

// Initialize seats data
const initialSeats: Seat[] = Array.from({ length: 80 }, (_, index) => ({
  id: index + 1,
  row: Math.floor(index / 7) + 1,
  number: index + 1,
  isBooked: false,
  userId: null,
}));

export default function Booking() {
  const [seats, setSeats] = useState<Seat[]>(() => {
    if (typeof window !== "undefined") {
      const savedSeats = localStorage.getItem("seats");
      return savedSeats ? JSON.parse(savedSeats) : initialSeats;
    }
    return initialSeats;
  });

  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [numSeats, setNumSeats] = useState(1);
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user");
      if (!userData) {
        router.push("/auth/login");
      } else {
        setUser(JSON.parse(userData));
      }
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("seats", JSON.stringify(seats));
    }
  }, [seats]);

  const handleSeatClick = (seatId: number) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((id) => id !== seatId));
    } else if (selectedSeats.length < numSeats) {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const handleBooking = () => {
    if (!user) return;

    const updatedSeats = seats.map((seat) =>
      selectedSeats.includes(seat.id)
        ? { ...seat, isBooked: true, userId: user.email }
        : seat,
    );

    setSeats(updatedSeats);
    setSelectedSeats([]);
    toast.success("Seats booked successfully!");
  };

  const handleCancelBooking = (seatId: number) => {
    const updatedSeats = seats.map((seat) =>
      seat.id === seatId ? { ...seat, isBooked: false, userId: null } : seat,
    );
    setSeats(updatedSeats);
    toast.success("Booking cancelled successfully!");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
    router.push("/");
  };

  const userBookings = seats.filter((seat) => seat.userId === user?.email);

  const renderSeats = () => {
    const rows: Seat[][] = [];
    let currentRow: Seat[] = [];

    seats.forEach((seat, index) => {
      currentRow.push(seat);
      if (currentRow.length === (index >= 77 ? 3 : 7)) {
        rows.push(currentRow);
        currentRow = [];
      }
    });

    return rows.map((row, rowIndex) => (
      <div key={rowIndex} className="flex justify-center gap-2 mb-2">
        {row.map((seat) => (
          <Button
            key={seat.id}
            variant={
              selectedSeats.includes(seat.id)
                ? "default"
                : seat.isBooked
                  ? "destructive"
                  : "outline"
            }
            className="w-12 h-12"
            disabled={seat.isBooked}
            onClick={() => handleSeatClick(seat.id)}
          >
            {seat.number}
          </Button>
        ))}
      </div>
    ));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">Welcome, {user.email}</p>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {userBookings.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {userBookings.map((seat) => (
                    <div
                      key={seat.id}
                      className="flex items-center justify-between bg-white p-4 rounded-lg border"
                    >
                      <span>Seat {seat.number}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelBooking(seat.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">You haven't booked any seats yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Select Your Seats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of seats (max 7)
              </label>
              <Input
                type="number"
                min="1"
                max="7"
                value={numSeats}
                onChange={(e) =>
                  setNumSeats(
                    Math.min(7, Math.max(1, parseInt(e.target.value))),
                  )
                }
                className="w-32"
              />
            </div>
            <div className="space-y-4">
              <div className="flex justify-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary rounded"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-destructive rounded"></div>
                  <span>Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                  <span>Available</span>
                </div>
              </div>
              {renderSeats()}
            </div>
            <div className="mt-6">
              <Button
                onClick={handleBooking}
                disabled={selectedSeats.length === 0}
                className="w-full"
              >
                Book Selected Seats
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
