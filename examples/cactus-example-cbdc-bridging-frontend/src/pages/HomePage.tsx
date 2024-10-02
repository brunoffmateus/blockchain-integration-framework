import { useState } from "react";
import Grid from "@mui/material/Grid";
import Ledger from "../components/Ledger";
import IconButton from "@mui/material/IconButton";
import HelpIcon from "@mui/icons-material/Help";
import ConnectionErrorDialog from "../components/dialogs/ConnectionErrorDialog";

export interface IHomePageOptions {
  path: string;
}
export default function HomePage(props: IHomePageOptions) {
  const [errorDialog, setErrorDialog] = useState<boolean>(false);

  return (
    <div style={{ width: "95%", margin: "4rem auto" }}>
      <Grid
        container
        sx={{
          width: "95%",
          margin: "2rem auto",
          textAlign: "center",
        }}
      >
        <Grid item sm={12} md={5}>
          <Ledger path={props.path} ledger={"FABRIC"} />
        </Grid>
        <Grid item sm={12} md={2}>
          <BridgeImage />
        </Grid>
        <Grid item sm={12} md={5}>
          <Ledger path={props.path} ledger={"BESU"} />
        </Grid>
      </Grid>
      <ConnectionErrorDialog
        open={errorDialog}
        onClose={() => setErrorDialog(false)}
      />
    </div>
  );
}

function BridgeImage() {
  return (
    <>
      <IconButton
        sx={{ marginTop: "1rem" }}
        color="secondary"
        aria-label="help"
        size="large"
        href="/help"
      >
        <HelpIcon />
      </IconButton>
      <br />
      <svg
        width="105"
        height="203"
        viewBox="0 0 105 203"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginTop: "5rem" }}
      >
        <path
          d="M91.4749 28.4749C92.8417 27.108 92.8417 24.892 91.4749 23.5251L69.201 1.25126C67.8342 -0.115572 65.6181 -0.115572 64.2513 1.25126C62.8844 2.6181 62.8844 4.83418 64.2513 6.20101L84.0503 26L64.2513 45.799C62.8844 47.1658 62.8844 49.3819 64.2513 50.7487C65.6181 52.1156 67.8342 52.1156 69.201 50.7487L91.4749 28.4749ZM16 29.5H89V22.5H16V29.5Z"
          fill="#CECECE"
        />
        <path
          d="M13.5251 174.525C12.1583 175.892 12.1583 178.108 13.5251 179.475L35.799 201.749C37.1658 203.116 39.3819 203.116 40.7487 201.749C42.1156 200.382 42.1156 198.166 40.7487 196.799L20.9497 177L40.7487 157.201C42.1156 155.834 42.1156 153.618 40.7487 152.251C39.3819 150.884 37.1658 150.884 35.799 152.251L13.5251 174.525ZM16 180.5H89V173.5H16V180.5Z"
          fill="#CECECE"
        />
        <path
          d="M19.7367 109V95H26.0167C27.6301 95 28.8701 95.3267 29.7367 95.98C30.6034 96.62 31.0367 97.5 31.0367 98.62C31.0367 99.38 30.8634 100.02 30.5167 100.54C30.1834 101.06 29.7301 101.46 29.1567 101.74C28.5834 102.02 27.9634 102.16 27.2967 102.16L27.6567 101.56C28.4567 101.56 29.1634 101.7 29.7767 101.98C30.3901 102.26 30.8767 102.673 31.2367 103.22C31.5967 103.753 31.7767 104.42 31.7767 105.22C31.7767 106.42 31.3234 107.353 30.4167 108.02C29.5234 108.673 28.1901 109 26.4167 109H19.7367ZM21.7367 107.38H26.3367C27.4434 107.38 28.2901 107.193 28.8767 106.82C29.4634 106.447 29.7567 105.86 29.7567 105.06C29.7567 104.247 29.4634 103.653 28.8767 103.28C28.2901 102.907 27.4434 102.72 26.3367 102.72H21.5567V101.1H25.8367C26.8501 101.1 27.6367 100.913 28.1967 100.54C28.7567 100.167 29.0367 99.6067 29.0367 98.86C29.0367 98.1133 28.7567 97.5533 28.1967 97.18C27.6367 96.8067 26.8501 96.62 25.8367 96.62H21.7367V107.38ZM34.8434 109V98.4H36.6834V101.28L36.5034 100.56C36.7968 99.8267 37.2901 99.2667 37.9834 98.88C38.6768 98.4933 39.5301 98.3 40.5434 98.3V100.16C40.4634 100.147 40.3834 100.14 40.3034 100.14C40.2368 100.14 40.1701 100.14 40.1034 100.14C39.0768 100.14 38.2634 100.447 37.6634 101.06C37.0634 101.673 36.7634 102.56 36.7634 103.72V109H34.8434ZM43.1598 109V98.4H45.0798V109H43.1598ZM44.1198 96.36C43.7465 96.36 43.4332 96.24 43.1798 96C42.9398 95.76 42.8198 95.4667 42.8198 95.12C42.8198 94.76 42.9398 94.46 43.1798 94.22C43.4332 93.98 43.7465 93.86 44.1198 93.86C44.4932 93.86 44.7998 93.98 45.0398 94.22C45.2932 94.4467 45.4198 94.7333 45.4198 95.08C45.4198 95.44 45.2998 95.7467 45.0598 96C44.8198 96.24 44.5065 96.36 44.1198 96.36ZM53.3758 109.12C52.3491 109.12 51.4291 108.893 50.6158 108.44C49.8158 107.987 49.1824 107.353 48.7158 106.54C48.2491 105.727 48.0158 104.78 48.0158 103.7C48.0158 102.62 48.2491 101.68 48.7158 100.88C49.1824 100.067 49.8158 99.4333 50.6158 98.98C51.4291 98.5267 52.3491 98.3 53.3758 98.3C54.2691 98.3 55.0758 98.5 55.7958 98.9C56.5158 99.3 57.0891 99.9 57.5158 100.7C57.9558 101.5 58.1758 102.5 58.1758 103.7C58.1758 104.9 57.9624 105.9 57.5358 106.7C57.1224 107.5 56.5558 108.107 55.8358 108.52C55.1158 108.92 54.2958 109.12 53.3758 109.12ZM53.5358 107.44C54.2024 107.44 54.8024 107.287 55.3358 106.98C55.8824 106.673 56.3091 106.24 56.6158 105.68C56.9358 105.107 57.0958 104.447 57.0958 103.7C57.0958 102.94 56.9358 102.287 56.6158 101.74C56.3091 101.18 55.8824 100.747 55.3358 100.44C54.8024 100.133 54.2024 99.98 53.5358 99.98C52.8558 99.98 52.2491 100.133 51.7158 100.44C51.1824 100.747 50.7558 101.18 50.4358 101.74C50.1158 102.287 49.9558 102.94 49.9558 103.7C49.9558 104.447 50.1158 105.107 50.4358 105.68C50.7558 106.24 51.1824 106.673 51.7158 106.98C52.2491 107.287 52.8558 107.44 53.5358 107.44ZM57.1558 109V106.14L57.2758 103.68L57.0758 101.22V94.16H58.9958V109H57.1558ZM67.5186 113C66.5453 113 65.5986 112.86 64.6786 112.58C63.7719 112.313 63.0319 111.927 62.4586 111.42L63.3786 109.94C63.8719 110.367 64.4786 110.7 65.1986 110.94C65.9186 111.193 66.6719 111.32 67.4586 111.32C68.7119 111.32 69.6319 111.027 70.2186 110.44C70.8053 109.853 71.0986 108.96 71.0986 107.76V105.52L71.2986 103.42L71.1986 101.3V98.4H73.0186V107.56C73.0186 109.427 72.5519 110.8 71.6186 111.68C70.6853 112.56 69.3186 113 67.5186 113ZM67.2786 108.56C66.2519 108.56 65.3319 108.347 64.5186 107.92C63.7186 107.48 63.0786 106.873 62.5986 106.1C62.1319 105.327 61.8986 104.433 61.8986 103.42C61.8986 102.393 62.1319 101.5 62.5986 100.74C63.0786 99.9667 63.7186 99.3667 64.5186 98.94C65.3319 98.5133 66.2519 98.3 67.2786 98.3C68.1853 98.3 69.0119 98.4867 69.7586 98.86C70.5053 99.22 71.0986 99.78 71.5386 100.54C71.9919 101.3 72.2186 102.26 72.2186 103.42C72.2186 104.567 71.9919 105.52 71.5386 106.28C71.0986 107.04 70.5053 107.613 69.7586 108C69.0119 108.373 68.1853 108.56 67.2786 108.56ZM67.4986 106.88C68.2053 106.88 68.8319 106.733 69.3786 106.44C69.9253 106.147 70.3519 105.74 70.6586 105.22C70.9786 104.7 71.1386 104.1 71.1386 103.42C71.1386 102.74 70.9786 102.14 70.6586 101.62C70.3519 101.1 69.9253 100.7 69.3786 100.42C68.8319 100.127 68.2053 99.98 67.4986 99.98C66.7919 99.98 66.1586 100.127 65.5986 100.42C65.0519 100.7 64.6186 101.1 64.2986 101.62C63.9919 102.14 63.8386 102.74 63.8386 103.42C63.8386 104.1 63.9919 104.7 64.2986 105.22C64.6186 105.74 65.0519 106.147 65.5986 106.44C66.1586 106.733 66.7919 106.88 67.4986 106.88ZM81.6572 109.12C80.5239 109.12 79.5239 108.887 78.6572 108.42C77.8039 107.953 77.1372 107.313 76.6572 106.5C76.1905 105.687 75.9572 104.753 75.9572 103.7C75.9572 102.647 76.1839 101.713 76.6372 100.9C77.1039 100.087 77.7372 99.4533 78.5372 99C79.3505 98.5333 80.2639 98.3 81.2772 98.3C82.3039 98.3 83.2105 98.5267 83.9972 98.98C84.7839 99.4333 85.3972 100.073 85.8372 100.9C86.2905 101.713 86.5172 102.667 86.5172 103.76C86.5172 103.84 86.5105 103.933 86.4972 104.04C86.4972 104.147 86.4905 104.247 86.4772 104.34H77.4572V102.96H85.4772L84.6972 103.44C84.7105 102.76 84.5705 102.153 84.2772 101.62C83.9839 101.087 83.5772 100.673 83.0572 100.38C82.5505 100.073 81.9572 99.92 81.2772 99.92C80.6105 99.92 80.0172 100.073 79.4972 100.38C78.9772 100.673 78.5705 101.093 78.2772 101.64C77.9839 102.173 77.8372 102.787 77.8372 103.48V103.8C77.8372 104.507 77.9972 105.14 78.3172 105.7C78.6505 106.247 79.1105 106.673 79.6972 106.98C80.2839 107.287 80.9572 107.44 81.7172 107.44C82.3439 107.44 82.9105 107.333 83.4172 107.12C83.9372 106.907 84.3905 106.587 84.7772 106.16L85.8372 107.4C85.3572 107.96 84.7572 108.387 84.0372 108.68C83.3305 108.973 82.5372 109.12 81.6572 109.12Z"
          fill="#A3A3A3"
        />
      </svg>
    </>
  );
}
