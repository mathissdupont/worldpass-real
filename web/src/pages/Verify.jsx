import VerifyVC from "../components/VerifyVC";
import OfflineVerify from "../components/OfflineVerify";

export default function Verify(){
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <VerifyVC/>
      <OfflineVerify/>
    </div>
  );
}
