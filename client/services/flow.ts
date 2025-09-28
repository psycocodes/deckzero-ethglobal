// Flow blockchain service for game rewards and transactions
import * as fcl from '@onflow/fcl';
import { config } from '@/config';

// Flow transaction types
export interface FlowGameReward {
  playerId: string;
  gameSessionId: string;
  rewardType: 'nft' | 'token' | 'badge';
  amount?: number;
  metadata?: any;
}

export interface FlowPlayer {
  address: string;
  username?: string;
  totalGamesWon: number;
  totalRewards: number;
  nftIds: string[];
}

export interface FlowTransaction {
  id: string;
  status: string;
  errorMessage?: string;
  events: any[];
}

class FlowService {
  private static instance: FlowService;
  private initialized = false;

  private constructor() {
    this.initializeFlow();
  }

  public static getInstance(): FlowService {
    if (!FlowService.instance) {
      FlowService.instance = new FlowService();
    }
    return FlowService.instance;
  }

  private async initializeFlow() {
    try {
      // Configure Flow Client Library
      fcl.config({
        'accessNode.api': config.flow.accessNodeUrl,
        'discovery.wallet': config.flow.discoveryWalletUrl,
        'app.detail.title': 'DeckZero',
        'app.detail.icon': config.walletConnect.appMetadata.icons[0],
        '0xGameRewards': config.flow.contracts.gameRewards,
        '0xNFTCollection': config.flow.contracts.nftCollection,
        '0xFungibleToken': config.flow.contracts.fungibleToken,
      });

      this.initialized = true;
      console.log('✅ Flow service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Flow service:', error);
      throw error;
    }
  }

  // Authenticate user with Flow (using Glow wallet integration)
  public async authenticateUser(): Promise<any> {
    try {
      const user = await fcl.authenticate();
      console.log('🔐 Flow user authenticated:', user);
      return user;
    } catch (error) {
      console.error('❌ Flow authentication failed:', error);
      throw error;
    }
  }

  // Get current user
  public async getCurrentUser(): Promise<any> {
    return fcl.currentUser.snapshot();
  }

  // Unauthenticate user
  public async unauthenticate(): Promise<void> {
    await fcl.unauthenticate();
  }

  // Create a new player profile on Flow
  public async createPlayerProfile(address: string, username?: string): Promise<FlowTransaction> {
    const transaction = `
      import GameRewards from 0xGameRewards

      transaction(username: String?) {
        prepare(signer: AuthAccount) {
          // Create player profile
          GameRewards.createPlayer(account: signer, username: username)
        }
        execute {
          log("Player profile created")
        }
      }
    `;

    try {
      const txId = await fcl.mutate({
        cadence: transaction,
        args: (arg: any, t: any) => [arg(username, t.Optional(t.String))],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });

      const result = await fcl.tx(txId).onceSealed();
      console.log('✅ Player profile created:', result);
      
      return {
        id: txId,
        status: result.status === 4 ? 'success' : 'failed',
        errorMessage: result.errorMessage,
        events: result.events,
      };
    } catch (error) {
      console.error('❌ Failed to create player profile:', error);
      throw error;
    }
  }

  // Reward player with NFT for winning a game
  public async rewardPlayerWithNFT(
    playerAddress: string,
    gameSessionId: string,
    metadata: any
  ): Promise<FlowTransaction> {
    const transaction = `
      import GameRewards from 0xGameRewards
      import NFTCollection from 0xNFTCollection

      transaction(playerAddress: Address, gameSessionId: String, metadata: {String: String}) {
        prepare(signer: AuthAccount) {
          // Mint NFT reward
          let recipient = getAccount(playerAddress)
          GameRewards.mintRewardNFT(
            recipient: recipient,
            gameSessionId: gameSessionId,
            metadata: metadata
          )
        }
        execute {
          log("NFT reward minted for player")
        }
      }
    `;

    try {
      const txId = await fcl.mutate({
        cadence: transaction,
        args: (arg: any, t: any) => [
          arg(playerAddress, t.Address),
          arg(gameSessionId, t.String),
          arg(metadata, t.Dictionary({ key: t.String, value: t.String })),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });

      const result = await fcl.tx(txId).onceSealed();
      console.log('🎁 NFT reward minted:', result);

      return {
        id: txId,
        status: result.status === 4 ? 'success' : 'failed',
        errorMessage: result.errorMessage,
        events: result.events,
      };
    } catch (error) {
      console.error('❌ Failed to mint NFT reward:', error);
      throw error;
    }
  }

  // Reward player with tokens
  public async rewardPlayerWithTokens(
    playerAddress: string,
    amount: number,
    gameSessionId: string
  ): Promise<FlowTransaction> {
    const transaction = `
      import GameRewards from 0xGameRewards
      import FungibleToken from 0xFungibleToken

      transaction(playerAddress: Address, amount: UFix64, gameSessionId: String) {
        prepare(signer: AuthAccount) {
          // Transfer tokens to player
          let recipient = getAccount(playerAddress)
          GameRewards.rewardTokens(
            recipient: recipient,
            amount: amount,
            gameSessionId: gameSessionId
          )
        }
        execute {
          log("Token reward transferred to player")
        }
      }
    `;

    try {
      const txId = await fcl.mutate({
        cadence: transaction,
        args: (arg: any, t: any) => [
          arg(playerAddress, t.Address),
          arg(amount.toFixed(8), t.UFix64),
          arg(gameSessionId, t.String),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });

      const result = await fcl.tx(txId).onceSealed();
      console.log('💰 Token reward sent:', result);

      return {
        id: txId,
        status: result.status === 4 ? 'success' : 'failed',
        errorMessage: result.errorMessage,
        events: result.events,
      };
    } catch (error) {
      console.error('❌ Failed to send token reward:', error);
      throw error;
    }
  }

  // Get player profile and stats
  public async getPlayerProfile(address: string): Promise<FlowPlayer | null> {
    const script = `
      import GameRewards from 0xGameRewards

      pub fun main(address: Address): GameRewards.Player? {
        return GameRewards.getPlayer(address: address)
      }
    `;

    try {
      const result = await fcl.query({
        cadence: script,
        args: (arg: any, t: any) => [arg(address, t.Address)],
      });

      if (result) {
        return {
          address: result.address,
          username: result.username,
          totalGamesWon: result.totalGamesWon,
          totalRewards: result.totalRewards,
          nftIds: result.nftIds || [],
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get player profile:', error);
      throw error;
    }
  }

  // Get player's NFT collection
  public async getPlayerNFTs(address: string): Promise<any[]> {
    const script = `
      import NFTCollection from 0xNFTCollection

      pub fun main(address: Address): [NFTCollection.NFTData] {
        let account = getAccount(address)
        return NFTCollection.getNFTs(account: account)
      }
    `;

    try {
      const result = await fcl.query({
        cadence: script,
        args: (arg: any, t: any) => [arg(address, t.Address)],
      });

      return result || [];
    } catch (error) {
      console.error('❌ Failed to get player NFTs:', error);
      return [];
    }
  }

  // Schedule Flow Action for automated rewards
  public async scheduleRewardAction(
    triggerCondition: string,
    rewardConfig: FlowGameReward
  ): Promise<string> {
    // This would integrate with Flow Actions for automation
    // For now, we'll simulate the scheduling
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('📅 Scheduled Flow Action:', {
      actionId,
      triggerCondition,
      rewardConfig,
    });

    // In a real implementation, this would:
    // 1. Create a Flow Action that monitors for the trigger condition
    // 2. Execute the reward transaction when condition is met
    // 3. Return the action ID for tracking

    return actionId;
  }

  // Listen for Flow events (game completion, rewards, etc.)
  public async subscribeToEvents(
    contractName: string,
    eventName: string,
    callback: (event: any) => void
  ): Promise<void> {
    try {
      // Set up event subscription
      fcl.events(`A.${config.flow.contracts.gameRewards}.${contractName}.${eventName}`)
        .subscribe(callback);

      console.log(`👂 Subscribed to ${contractName}.${eventName} events`);
    } catch (error) {
      console.error('❌ Failed to subscribe to events:', error);
      throw error;
    }
  }

  // Get Flow account balance
  public async getAccountBalance(address: string): Promise<number> {
    const script = `
      import FungibleToken from 0xFungibleToken

      pub fun main(address: Address): UFix64 {
        let account = getAccount(address)
        let balance = account.balance
        return balance
      }
    `;

    try {
      const result = await fcl.query({
        cadence: script,
        args: (arg: any, t: any) => [arg(address, t.Address)],
      });

      return parseFloat(result) || 0;
    } catch (error) {
      console.error('❌ Failed to get account balance:', error);
      return 0;
    }
  }

  // Batch reward multiple players
  public async batchRewardPlayers(rewards: FlowGameReward[]): Promise<FlowTransaction> {
    const transaction = `
      import GameRewards from 0xGameRewards

      transaction(rewards: [GameRewards.RewardData]) {
        prepare(signer: AuthAccount) {
          GameRewards.batchReward(rewards: rewards)
        }
        execute {
          log("Batch rewards distributed")
        }
      }
    `;

    try {
      const rewardData = rewards.map(reward => ({
        playerId: reward.playerId,
        gameSessionId: reward.gameSessionId,
        rewardType: reward.rewardType,
        amount: reward.amount || 0,
        metadata: reward.metadata || {},
      }));

      const txId = await fcl.mutate({
        cadence: transaction,
        args: (arg: any, t: any) => [
          arg(rewardData, t.Array(t.Dictionary({ key: t.String, value: t.String }))),
        ],
        proposer: fcl.currentUser,
        payer: fcl.currentUser,
        authorizations: [fcl.currentUser],
        limit: 1000,
      });

      const result = await fcl.tx(txId).onceSealed();
      console.log('🎁 Batch rewards distributed:', result);

      return {
        id: txId,
        status: result.status === 4 ? 'success' : 'failed',
        errorMessage: result.errorMessage,
        events: result.events,
      };
    } catch (error) {
      console.error('❌ Failed to distribute batch rewards:', error);
      throw error;
    }
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      await fcl.query({
        cadence: `pub fun main(): UFix64 { return getCurrentBlock().timestamp }`,
      });
      return true;
    } catch (error) {
      console.error('❌ Flow health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const flowService = FlowService.getInstance();
export default flowService;