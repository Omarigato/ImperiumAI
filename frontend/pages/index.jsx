import Link from 'next/link';
import { motion } from 'framer-motion';
import NavBar from '../components/NavBar';
import { useLang } from '../contexts/LanguageContext';

export default function IndexPage() {
  const { t } = useLang();
  const h = t.home;

  return (
    <div className="page-root">
      <NavBar />
      <main className="academic-main">
        {/* Hero */}
        <section className="hero-section">
          <span className="research-badge">{h.badge}</span>
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {h.titleLine1}
            <span className="hero-title-accent"> {h.titleLine2}</span>
          </motion.h1>
          <p className="hero-alt-lang">{h.titleRu}</p>
          <p className="hero-alt-lang">{h.titleKz}</p>
          <div className="hero-cta">
            <Link href="/battle" className="btn-primary">
              {h.startBtn}
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              {h.dashboardBtn}
            </Link>
            <Link href="/documentation" className="btn-outline">
              {h.logsBtn}
            </Link>
          </div>
        </section>

        {/* Research goal + description */}
        <section className="info-grid">
          <motion.div
            className="info-card info-card-wide"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="card-heading">{h.goal}</h2>
            <p className="card-text">{h.goalText}</p>
          </motion.div>
          <motion.div
            className="info-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="card-heading">{h.description}</h2>
            <p className="card-text">{h.descText}</p>
          </motion.div>
        </section>

        {/* Thesis structure */}
        <section className="structure-section">
          <h2 className="section-title">{h.structure}</h2>
          <ol className="structure-list">
            {h.structureItems.map((item, idx) => (
              <motion.li
                key={item.num}
                className="structure-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
              >
                <span className="structure-num">{item.num}</span>
                <div>
                  <div className="structure-title">{item.title}</div>
                  <div className="structure-sub">{item.sub}</div>
                </div>
              </motion.li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
