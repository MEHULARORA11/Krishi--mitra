import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import ProtectedLink from "./ProtectedLink";

const Hero = () => {
  const { t } = useLanguage();

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-content">
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroSubtitle")}</p>

          <div className="hero-buttons">
            <ProtectedLink to="/chat" className="btn btn-primary btn-small ">
              {t("startAIChat")}
            </ProtectedLink>
            <ProtectedLink to="/weather" className="btn btn-secondary btn-small ">
              {t("checkWeather")}
            </ProtectedLink>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
