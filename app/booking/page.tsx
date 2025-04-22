"use client";

import { useEffect, useState, useCallback } from "react";
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
  seatInRow: number;
  isBooked: boolean;
  userId: string | null;
}

const getSeatDetails = (index: number): Omit<Seat, "isBooked" | "userId"> => {
  const row = Math.floor(index / 7) + 1;
  const seatInRow = (index % 7) + 1;
  return {
    id: index + 1,
    row: row,
    number: index + 1,
    seatInRow: seatInRow,
  };
};

const initializeSeats = (): Seat[] => {
  return Array.from({ length: 80 }, (_, index) => {
    const details = getSeatDetails(index);
    return {
      ...details,
      isBooked: false,
      userId: null,
    };
  });
};

export default function Booking() {
  const [seats, setSeats] = useState<Seat[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedSeats = localStorage.getItem("seats");
        if (savedSeats) {
          const parsedSeats = JSON.parse(savedSeats);
          if (
            Array.isArray(parsedSeats) &&
            parsedSeats.length === 80 &&
            "seatInRow" in parsedSeats[0]
          ) {
            return parsedSeats;
          }
        }
      } catch (e) {
        console.error("Failed to load seats from local storage", e);
        localStorage.removeItem("seats");
      }
    }
    return initializeSeats();
  });

  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [numSeats, setNumSeats] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user");
      if (!userData) {
        router.push("/auth/login");
      } else {
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          console.error("Failed to parse user data", e);
          localStorage.removeItem("user");
          router.push("/auth/login");
        }
      }
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("seats", JSON.stringify(seats));
    }
  }, [seats]);

  useEffect(() => {
    setSelectedSeats([]);
  }, [numSeats]);

  const handleSeatClick = (seatId: number) => {
    if (isBooking) return;

    const seat = seats.find((s) => s.id === seatId);
    if (!seat || seat.isBooked) return;

    setSelectedSeats((prevSelected) => {
      if (prevSelected.includes(seatId)) {
        return prevSelected.filter((id) => id !== seatId);
      } else {
        if (prevSelected.length < numSeats) {
          return [...prevSelected, seatId];
        } else {
          toast.info(`You can only select ${numSeats} seat(s) manually.`);
          return prevSelected;
        }
      }
    });
  };

  const findSeatsInOneRow = useCallback(
    (numSeatsToBook: number, currentSeats: Seat[]): number[] | null => {
      const seatsByRow: { [key: number]: Seat[] } = {};
      currentSeats.forEach((seat) => {
        if (!seatsByRow[seat.row]) {
          seatsByRow[seat.row] = [];
        }
        seatsByRow[seat.row].push(seat);
      });
      for (const rowNum in seatsByRow) {
        seatsByRow[rowNum].sort((a, b) => a.seatInRow - b.seatInRow);
      }

      for (const rowNum in seatsByRow) {
        const rowSeats = seatsByRow[rowNum];
        for (let i = 0; i <= rowSeats.length - numSeatsToBook; i++) {
          const potentialBlock = rowSeats.slice(i, i + numSeatsToBook);
          // Check if all seats in this potential block are available
          const allAvailable = potentialBlock.every((seat) => !seat.isBooked);
          if (allAvailable) {
            // Found a block!
            return potentialBlock.map((s) => s.id);
          }
        }
      }

      return null;
    },
    [],
  );

  const handleBooking = useCallback(async () => {
    if (!user || isBooking) return;
    setIsBooking(true);

    let seatsToBookIds: number[] | null = null;
    if (selectedSeats.length === numSeats) {
      const manuallySelectedAvailable = selectedSeats.every((id) => {
        const seat = seats.find((s) => s.id === id);
        return seat && !seat.isBooked;
      });

      if (manuallySelectedAvailable) {
        seatsToBookIds = selectedSeats;
        toast.info("Booking manually selected seats.");
      } else {
        toast.error(
          "Some manually selected seats are no longer available. Please re-select.",
        );
        setSelectedSeats([]);
        setIsBooking(false);
        return;
      }
    } else {
      toast.info(`Attempting to find ${numSeats} seat(s) together...`);
      seatsToBookIds = findSeatsInOneRow(numSeats, seats);
    }

    if (seatsToBookIds && seatsToBookIds.length > 0) {
      const updatedSeats = seats.map((seat) =>
        seatsToBookIds!.includes(seat.id)
          ? { ...seat, isBooked: true, userId: user.email }
          : seat,
      );

      setSeats(updatedSeats);
      setSelectedSeats([]);
      toast.success(
        `Successfully booked seat(s): ${seatsToBookIds.join(", ")}`,
      );
    } else if (selectedSeats.length === 0) {
      toast.error(
        `Could not automatically find ${numSeats} seat(s) together in one row. Please select seats manually or try booking fewer.`,
      );
    } else {
      toast.warning(
        `Please select exactly ${numSeats} seat(s) or clear selection to book automatically.`,
      );
    }

    setIsBooking(false);
  }, [user, isBooking, selectedSeats, numSeats, seats, findSeatsInOneRow]);

  const handleCancelBooking = (seatId: number) => {
    if (isBooking) {
      toast.warning("Please wait for the current booking process to finish.");
      return;
    }
    const updatedSeats = seats.map((seat) =>
      seat.id === seatId ? { ...seat, isBooked: false, userId: null } : seat,
    );
    setSeats(updatedSeats);
    toast.success("Booking cancelled successfully!");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("seats");
    }
    router.push("/");
  };

  const userBookings = seats.filter((seat) => seat.userId === user?.email);

  const renderSeats = () => {
    const seatsByRow: Seat[][] = [];
    seats.forEach((seat) => {
      if (!seatsByRow[seat.row - 1]) {
        seatsByRow[seat.row - 1] = [];
      }
      seatsByRow[seat.row - 1].push(seat);
    });
    seatsByRow.forEach((row) => row.sort((a, b) => a.seatInRow - b.seatInRow));

    return seatsByRow.map((row, rowIndex) => (
      <div key={rowIndex} className="flex justify-center gap-2 mb-2 flex-wrap">
        {row.map((seat) => (
          <Button
            key={seat.id}
            variant={
              selectedSeats.includes(seat.id)
                ? "default"
                : seat.isBooked && seat.userId === user?.email
                  ? "secondary"
                  : seat.isBooked
                    ? "destructive"
                    : "outline"
            }
            className="w-12 h-12 text-xs p-0"
            disabled={
              (seat.isBooked && seat.userId !== user?.email) || isBooking
            }
            onClick={() => handleSeatClick(seat.id)}
            title={`Seat ${seat.number} (Row ${seat.row})`}
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
                        disabled={isBooking}
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
            <CardTitle>Book Seats</CardTitle>
            Enter the number of seats and click Book Seats button. The system
            will try to find adjacent seats in one row. Alternatively, manually
            select available seats before clicking Book Seats button.
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <label
                htmlFor="numSeatsInput"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Number of seats (1-7)
              </label>
              <Input
                id="numSeatsInput"
                type="number"
                min="1"
                max="7"
                value={numSeats}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setNumSeats(Math.min(7, Math.max(1, val)));
                  } else {
                    setNumSeats(1);
                  }
                }}
                className="w-32"
                disabled={isBooking}
              />
            </div>
            <div className="space-y-4">
              <div className="flex justify-center gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary rounded"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-secondary rounded border border-gray-400"></div>
                  <span>Your Seat</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-destructive rounded"></div>
                  <span>Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded bg-white"></div>
                  <span>Available</span>
                </div>
              </div>
              {renderSeats()}
            </div>
            <div className="mt-6">
              <Button
                onClick={handleBooking}
                disabled={
                  isBooking ||
                  (selectedSeats.length > 0 &&
                    selectedSeats.length !== numSeats)
                }
                className="w-full"
              >
                {isBooking ? "Booking..." : "Book Seats"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
