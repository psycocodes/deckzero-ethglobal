import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("gameModule", (m) => {
  const game = m.contract("KeynesianBeautyContest");

  return { game };
});
