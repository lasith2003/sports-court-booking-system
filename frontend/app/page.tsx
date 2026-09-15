import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.hero}>
      {/* Background Image */}
      <div className={styles.heroBg}>
        <Image
          src="/images/hero-main.jpg"
          alt="Aerial view of illuminated sports courts at night"
          fill
          priority
          quality={90}
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
        <div className={styles.heroOverlay} />
      </div>

      {/* Content */}
      <div className={`container ${styles.heroContent}`}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Now booking 500+ courts across Sri Lanka
        </div>

        <h1 className={styles.title}>
          Book Your Perfect
          <span className="gradient-text"> Sports Court</span>
          <br />
          In Seconds
        </h1>

        <p className={styles.subtitle}>
          Discover premium badminton, tennis, futsal, basketball &amp; cricket courts.
          Real-time availability. Instant confirmation. Zero hassle.
        </p>

        <div className={styles.ctas}>
          <a href="/search" className={styles.ctaPrimary}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Find a Court
          </a>
          <a href="/register" className={styles.ctaSecondary}>
            Get Started Free
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>

        {/* Sport Categories */}
        <div className={styles.sports}>
          {[
            { name: "Badminton", img: "/images/hero-badminton.jpg" },
            { name: "Futsal", img: "/images/hero-futsal.jpg" },
            { name: "Tennis", img: "/images/hero-tennis.jpg" },
            { name: "Basketball", img: "/images/hero-basketball.jpg" },
            { name: "Cricket", img: "/images/hero-cricket.jpg" },
          ].map((sport, i) => (
            <div
              key={sport.name}
              className={`${styles.sportCard} animate-fade-in-up delay-${i + 1}`}
            >
              <div className={styles.sportImg}>
                <Image
                  src={sport.img}
                  alt={`${sport.name} court`}
                  fill
                  sizes="80px"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <span className={styles.sportName}>{sport.name}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>500+</span>
            <span className={styles.statLabel}>Courts</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>50+</span>
            <span className={styles.statLabel}>Venues</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>10K+</span>
            <span className={styles.statLabel}>Bookings</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>5</span>
            <span className={styles.statLabel}>Sports</span>
          </div>
        </div>
      </div>
    </div>
  );
}
