/**
 * prisma/seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Seed script for Sport Court Booking System.
 * Populates the database with realistic Sri Lankan sample data:
 *   • 1 Admin user
 *   • 2 Venue Owners
 *   • 3 Customers
 *   • 3 Venues (Colombo, Kandy, Galle)
 *   • 8 Courts across those venues
 *   • 10 Bookings (mix of CONFIRMED, PENDING, CANCELLED, COMPLETED)
 *   • 10 Payments (PAID, PENDING, REFUNDED)
 *   • 5 Reviews
 *
 * Run: npx prisma db seed
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient, Role, SportType, BookingStatus, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────────────

/** Hash a plain-text password using the same bcrypt settings as AuthService */
async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/** Build a UTC midnight DateTime for a given YYYY-MM-DD string */
function bookingDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ── 0. Clean existing data (order matters — FK constraints) ──────────────
  console.log('🧹 Cleaning existing data...');
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.court.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();
  console.log('   ✓ All tables cleared\n');

  // ── 1. Users ─────────────────────────────────────────────────────────────
  console.log('👤 Creating users...');

  const adminUser = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin@sportcourt.lk',
      password: await hash('Admin@1234'),
      role: Role.ADMIN,
    },
  });

  const ownerNuwan = await prisma.user.create({
    data: {
      name: 'Nuwan Perera',
      email: 'nuwan@sportcourt.lk',
      password: await hash('Owner@1234'),
      role: Role.VENUE_OWNER,
    },
  });

  const ownerSamantha = await prisma.user.create({
    data: {
      name: 'Samantha Silva',
      email: 'samantha@sportcourt.lk',
      password: await hash('Owner@1234'),
      role: Role.VENUE_OWNER,
    },
  });

  const customerKamal = await prisma.user.create({
    data: {
      name: 'Kamal Jayawardena',
      email: 'kamal@gmail.com',
      password: await hash('Customer@1234'),
      role: Role.CUSTOMER,
    },
  });

  const customerSunil = await prisma.user.create({
    data: {
      name: 'Sunil Fernando',
      email: 'sunil@gmail.com',
      password: await hash('Customer@1234'),
      role: Role.CUSTOMER,
    },
  });

  const customerNadeesha = await prisma.user.create({
    data: {
      name: 'Nadeesha Rathnayake',
      email: 'nadeesha@gmail.com',
      password: await hash('Customer@1234'),
      role: Role.CUSTOMER,
    },
  });

  console.log(`   ✓ Admin:          ${adminUser.email}`);
  console.log(`   ✓ Venue Owner 1:  ${ownerNuwan.email}`);
  console.log(`   ✓ Venue Owner 2:  ${ownerSamantha.email}`);
  console.log(`   ✓ Customer 1:     ${customerKamal.email}`);
  console.log(`   ✓ Customer 2:     ${customerSunil.email}`);
  console.log(`   ✓ Customer 3:     ${customerNadeesha.email}\n`);

  // ── 2. Venues ─────────────────────────────────────────────────────────────
  console.log('🏟️  Creating venues...');

  const venueColomboPlex = await prisma.venue.create({
    data: {
      ownerId: ownerNuwan.id,
      name: 'Colombo Sports Plex',
      address: '45 Galle Road, Kollupitiya',
      city: 'Colombo',
      description:
        'Premium multi-sport complex in the heart of Colombo. Features 5 world-class courts with professional lighting and changing rooms.',
      imageUrl: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800',
    },
  });

  const venueKandyArena = await prisma.venue.create({
    data: {
      ownerId: ownerNuwan.id,
      name: 'Kandy Sports Arena',
      address: '12 Peradeniya Road',
      city: 'Kandy',
      description:
        'Nestled in the hills of Kandy, this arena provides a refreshing environment for badminton and tennis enthusiasts.',
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800',
    },
  });

  const venueGalleFutsal = await prisma.venue.create({
    data: {
      ownerId: ownerSamantha.id,
      name: 'Galle Futsal & Cricket Centre',
      address: '78 Lighthouse Street',
      city: 'Galle',
      description:
        "Coastal city's premier futsal and cricket facility. Indoor turf, 24/7 security, and ample parking.",
      imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800',
    },
  });

  console.log(`   ✓ ${venueColomboPlex.name} (${venueColomboPlex.city})`);
  console.log(`   ✓ ${venueKandyArena.name} (${venueKandyArena.city})`);
  console.log(`   ✓ ${venueGalleFutsal.name} (${venueGalleFutsal.city})\n`);

  // ── 3. Courts ─────────────────────────────────────────────────────────────
  console.log('🎾 Creating courts...');

  // Colombo Sports Plex — 3 courts
  const courtBadminton1 = await prisma.court.create({
    data: {
      venueId: venueColomboPlex.id,
      name: 'Badminton Court A',
      sportType: SportType.BADMINTON,
      pricePerHour: 1500,
      openingTime: '06:00',
      closingTime: '22:00',
    },
  });

  const courtBadminton2 = await prisma.court.create({
    data: {
      venueId: venueColomboPlex.id,
      name: 'Badminton Court B',
      sportType: SportType.BADMINTON,
      pricePerHour: 1500,
      openingTime: '06:00',
      closingTime: '22:00',
    },
  });

  const courtTennis1 = await prisma.court.create({
    data: {
      venueId: venueColomboPlex.id,
      name: 'Tennis Court 1',
      sportType: SportType.TENNIS,
      pricePerHour: 2500,
      openingTime: '06:00',
      closingTime: '21:00',
    },
  });

  // Kandy Sports Arena — 2 courts
  const courtBadmintonKandy = await prisma.court.create({
    data: {
      venueId: venueKandyArena.id,
      name: 'Badminton Court - Kandy',
      sportType: SportType.BADMINTON,
      pricePerHour: 1200,
      openingTime: '07:00',
      closingTime: '21:00',
    },
  });

  const courtSquash = await prisma.court.create({
    data: {
      venueId: venueKandyArena.id,
      name: 'Squash Court',
      sportType: SportType.SQUASH,
      pricePerHour: 2000,
      openingTime: '07:00',
      closingTime: '20:00',
    },
  });

  // Galle Futsal & Cricket Centre — 3 courts
  const courtFutsal1 = await prisma.court.create({
    data: {
      venueId: venueGalleFutsal.id,
      name: 'Futsal Pitch 1',
      sportType: SportType.FUTSAL,
      pricePerHour: 3000,
      openingTime: '08:00',
      closingTime: '22:00',
    },
  });

  const courtFutsal2 = await prisma.court.create({
    data: {
      venueId: venueGalleFutsal.id,
      name: 'Futsal Pitch 2',
      sportType: SportType.FUTSAL,
      pricePerHour: 3000,
      openingTime: '08:00',
      closingTime: '22:00',
    },
  });

  const courtCricket = await prisma.court.create({
    data: {
      venueId: venueGalleFutsal.id,
      name: 'Cricket Net - Lane A',
      sportType: SportType.CRICKET_NET,
      pricePerHour: 1800,
      openingTime: '06:00',
      closingTime: '18:00',
    },
  });

  console.log(`   ✓ ${courtBadminton1.name}      — Rs. ${courtBadminton1.pricePerHour}/hr`);
  console.log(`   ✓ ${courtBadminton2.name}      — Rs. ${courtBadminton2.pricePerHour}/hr`);
  console.log(`   ✓ ${courtTennis1.name}         — Rs. ${courtTennis1.pricePerHour}/hr`);
  console.log(`   ✓ ${courtBadmintonKandy.name}  — Rs. ${courtBadmintonKandy.pricePerHour}/hr`);
  console.log(`   ✓ ${courtSquash.name}          — Rs. ${courtSquash.pricePerHour}/hr`);
  console.log(`   ✓ ${courtFutsal1.name}         — Rs. ${courtFutsal1.pricePerHour}/hr`);
  console.log(`   ✓ ${courtFutsal2.name}         — Rs. ${courtFutsal2.pricePerHour}/hr`);
  console.log(`   ✓ ${courtCricket.name}         — Rs. ${courtCricket.pricePerHour}/hr\n`);

  // ── 4. Bookings + Payments ────────────────────────────────────────────────
  console.log('📅 Creating bookings & payments...');

  // Booking 1 — Kamal books Badminton Court A (CONFIRMED + PAID)
  const booking1 = await prisma.booking.create({
    data: {
      customerId: customerKamal.id,
      courtId: courtBadminton1.id,
      date: bookingDate('2026-09-15'),
      startTime: '09:00',
      endTime: '10:00',
      status: BookingStatus.CONFIRMED,
      totalPrice: 1500,
    },
  });
  await prisma.payment.create({
    data: { bookingId: booking1.id, amount: 1500, status: PaymentStatus.PAID, method: 'mock_card' },
  });

  // Booking 2 — Sunil books Tennis Court 1 (CONFIRMED + PAID)
  const booking2 = await prisma.booking.create({
    data: {
      customerId: customerSunil.id,
      courtId: courtTennis1.id,
      date: bookingDate('2026-09-15'),
      startTime: '14:00',
      endTime: '16:00',
      status: BookingStatus.CONFIRMED,
      totalPrice: 5000,
    },
  });
  await prisma.payment.create({
    data: { bookingId: booking2.id, amount: 5000, status: PaymentStatus.PAID, method: 'mock_card' },
  });

  // Booking 3 — Nadeesha books Futsal Pitch 1 (CONFIRMED + PAID)
  const booking3 = await prisma.booking.create({
    data: {
      customerId: customerNadeesha.id,
      courtId: courtFutsal1.id,
      date: bookingDate('2026-09-16'),
      startTime: '18:00',
      endTime: '19:00',
      status: BookingStatus.CONFIRMED,
      totalPrice: 3000,
    },
  });
  await prisma.payment.create({
    data: { bookingId: booking3.id, amount: 3000, status: PaymentStatus.PAID, method: 'mock_card' },
  });

  // Booking 4 — Kamal books Badminton Court B (PENDING)
  const booking4 = await prisma.booking.create({
    data: {
      customerId: customerKamal.id,
      courtId: courtBadminton2.id,
      date: bookingDate('2026-09-18'),
      startTime: '08:00',
      endTime: '09:00',
      status: BookingStatus.PENDING,
      totalPrice: 1500,
    },
  });
  await prisma.payment.create({
    data: { bookingId: booking4.id, amount: 1500, status: PaymentStatus.PENDING, method: null },
  });

  // Booking 5 — Sunil books Squash Court (PENDING)
  const booking5 = await prisma.booking.create({
    data: {
      customerId: customerSunil.id,
      courtId: courtSquash.id,
      date: bookingDate('2026-09-20'),
      startTime: '10:00',
      endTime: '11:00',
      status: BookingStatus.PENDING,
      totalPrice: 2000,
    },
  });
  await prisma.payment.create({
    data: { bookingId: booking5.id, amount: 2000, status: PaymentStatus.PENDING, method: null },
  });

  // Booking 6 — Nadeesha books Cricket Net (CANCELLED + REFUNDED)
  const booking6 = await prisma.booking.create({
    data: {
      customerId: customerNadeesha.id,
      courtId: courtCricket.id,
      date: bookingDate('2026-09-10'),
      startTime: '07:00',
      endTime: '08:00',
      status: BookingStatus.CANCELLED,
      totalPrice: 1800,
    },
  });
  await prisma.payment.create({
    data: { bookingId: booking6.id, amount: 1800, status: PaymentStatus.REFUNDED, method: 'mock_card' },
  });

  // Booking 7 — Kamal books Kandy Badminton (COMPLETED + PAID)
  const booking7 = await prisma.booking.create({
    data: {
      customerId: customerKamal.id,
      courtId: courtBadmintonKandy.id,
      date: bookingDate('2026-09-05'),
      startTime: '15:00',
      endTime: '17:00',
      status: BookingStatus.COMPLETED,
      totalPrice: 2400,
    },
  });
  await prisma.payment.create({
    data: { bookingId: booking7.id, amount: 2400, status: PaymentStatus.PAID, method: 'mock_card' },
  });

  // Booking 8 — Sunil books Futsal Pitch 2 (COMPLETED + PAID)
  const booking8 = await prisma.booking.create({
    data: {
      customerId: customerSunil.id,
      courtId: courtFutsal2.id,
      date: bookingDate('2026-09-07'),
      startTime: '20:00',
      endTime: '21:00',
      status: BookingStatus.COMPLETED,
      totalPrice: 3000,
    },
  });
  await prisma.payment.create({
    data: { bookingId: booking8.id, amount: 3000, status: PaymentStatus.PAID, method: 'mock_card' },
  });

  // Booking 9 — Nadeesha books Badminton Court A (COMPLETED + PAID)
  const booking9 = await prisma.booking.create({
    data: {
      customerId: customerNadeesha.id,
      courtId: courtBadminton1.id,
      date: bookingDate('2026-09-03'),
      startTime: '07:00',
      endTime: '08:00',
      status: BookingStatus.COMPLETED,
      totalPrice: 1500,
    },
  });
  await prisma.payment.create({
    data: { bookingId: booking9.id, amount: 1500, status: PaymentStatus.PAID, method: 'mock_card' },
  });

  // Booking 10 — Kamal books Tennis Court 1 (COMPLETED + PAID)
  const booking10 = await prisma.booking.create({
    data: {
      customerId: customerKamal.id,
      courtId: courtTennis1.id,
      date: bookingDate('2026-09-01'),
      startTime: '11:00',
      endTime: '12:00',
      status: BookingStatus.COMPLETED,
      totalPrice: 2500,
    },
  });
  await prisma.payment.create({
    data: { bookingId: booking10.id, amount: 2500, status: PaymentStatus.PAID, method: 'mock_card' },
  });

  console.log('   ✓ Booking 1  — Kamal      → Badminton Court A   [CONFIRMED / PAID]');
  console.log('   ✓ Booking 2  — Sunil      → Tennis Court 1      [CONFIRMED / PAID]');
  console.log('   ✓ Booking 3  — Nadeesha   → Futsal Pitch 1      [CONFIRMED / PAID]');
  console.log('   ✓ Booking 4  — Kamal      → Badminton Court B   [PENDING]');
  console.log('   ✓ Booking 5  — Sunil      → Squash Court        [PENDING]');
  console.log('   ✓ Booking 6  — Nadeesha   → Cricket Net         [CANCELLED / REFUNDED]');
  console.log('   ✓ Booking 7  — Kamal      → Badminton Kandy     [COMPLETED / PAID]');
  console.log('   ✓ Booking 8  — Sunil      → Futsal Pitch 2      [COMPLETED / PAID]');
  console.log('   ✓ Booking 9  — Nadeesha   → Badminton Court A   [COMPLETED / PAID]');
  console.log('   ✓ Booking 10 — Kamal      → Tennis Court 1      [COMPLETED / PAID]\n');

  // ── 5. Reviews ────────────────────────────────────────────────────────────
  console.log('⭐ Creating reviews...');

  await prisma.review.create({
    data: {
      customerId: customerKamal.id,
      courtId: courtBadmintonKandy.id,
      rating: 5,
      comment:
        'Excellent court! Very clean and well maintained. The lighting is perfect for evening games. Will definitely book again!',
    },
  });

  await prisma.review.create({
    data: {
      customerId: customerKamal.id,
      courtId: courtTennis1.id,
      rating: 4,
      comment:
        'Great tennis court with good facilities. Parking is a bit limited but the court itself is top quality.',
    },
  });

  await prisma.review.create({
    data: {
      customerId: customerSunil.id,
      courtId: courtFutsal2.id,
      rating: 5,
      comment:
        'Best futsal pitch in Galle! The artificial turf is brand new and the changing rooms are spotless. Highly recommended!',
    },
  });

  await prisma.review.create({
    data: {
      customerId: customerNadeesha.id,
      courtId: courtBadminton1.id,
      rating: 4,
      comment:
        'Good badminton court, well ventilated. Staff were helpful and friendly. Shuttle cocks are available for purchase.',
    },
  });

  await prisma.review.create({
    data: {
      customerId: customerSunil.id,
      courtId: courtTennis1.id,
      rating: 3,
      comment:
        'Decent court but the booking process needs improvement. The court surface could use some maintenance.',
    },
  });

  console.log('   ✓ 5 reviews created\n');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('─'.repeat(60));
  console.log('✅ Database seeded successfully!\n');
  console.log('📋 Summary:');
  console.log('   Users:    6  (1 Admin, 2 Venue Owners, 3 Customers)');
  console.log('   Venues:   3  (Colombo, Kandy, Galle)');
  console.log('   Courts:   8  (Badminton x3, Tennis x1, Squash x1, Futsal x2, Cricket x1)');
  console.log('   Bookings: 10 (3 Confirmed, 2 Pending, 1 Cancelled, 4 Completed)');
  console.log('   Payments: 10 (7 Paid, 2 Pending, 1 Refunded)');
  console.log('   Reviews:  5');
  console.log('\n🔑 Test Credentials:');
  console.log('   Admin         → admin@sportcourt.lk    / Admin@1234');
  console.log('   Venue Owner 1 → nuwan@sportcourt.lk    / Owner@1234');
  console.log('   Venue Owner 2 → samantha@sportcourt.lk / Owner@1234');
  console.log('   Customer 1    → kamal@gmail.com        / Customer@1234');
  console.log('   Customer 2    → sunil@gmail.com        / Customer@1234');
  console.log('   Customer 3    → nadeesha@gmail.com     / Customer@1234');
  console.log('─'.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
