import styles from "./Home.module.css";
import logo from "../../../../../../images/HL_Cacti_Logo_Color.png";
const Home = () => {
  return (
    <div className={styles.home}>
      <p className={styles["home-scale"]}>
        Select ledger from the dropdown menu
      </p>
      <span className={styles["home-icon"]}>
        <img className={styles["home-scale"]} src={logo} alt="Logo" />
      </span>
    </div>
  );
};

export default Home;
