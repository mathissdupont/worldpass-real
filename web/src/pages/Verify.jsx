import VerifyVC from "../components/VerifyVC";
import OfflineVerify from "../components/OfflineVerify";

export default function Verify(){
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <VerifyVC/>
      <OfflineVerify/>
    </div>
  );
}
