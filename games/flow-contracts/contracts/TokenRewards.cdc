import FungibleToken from 0xf8d6e0586b0a20c7
import MetadataViews from 0xf8d6e0586b0a20c7

/// TokenRewards - Fungible Token contract for DeckZero game token rewards
///
pub contract TokenRewards: FungibleToken {

    /// Total supply of TokenRewards in circulation
    pub var totalSupply: UFix64

    /// Event that is emitted when the contract is created
    pub event TokensInitialized(initialSupply: UFix64)

    /// Event that is emitted when tokens are withdrawn from a Vault
    pub event TokensWithdrawn(amount: UFix64, from: Address?)

    /// Event that is emitted when tokens are deposited to a Vault
    pub event TokensDeposited(amount: UFix64, to: Address?)

    /// Event that is emitted when tokens are minted as rewards
    pub event RewardTokensMinted(amount: UFix64, recipient: Address, reason: String)

    /// Storage and Public Paths
    pub let VaultStoragePath: StoragePath
    pub let VaultPublicPath: PublicPath
    pub let MinterStoragePath: StoragePath
    pub let AdminStoragePath: StoragePath

    /// Vault resource that holds the tokens
    pub resource Vault: FungibleToken.Provider, FungibleToken.Receiver, FungibleToken.Balance, MetadataViews.Resolver {

        /// The total balance of this vault
        pub var balance: UFix64

        /// Initialize the balance at resource creation time
        init(balance: UFix64) {
            self.balance = balance
        }

        /// Withdraw tokens from the vault
        /// @param amount: The amount of tokens to withdraw
        pub fun withdraw(amount: UFix64): @FungibleToken.Vault {
            self.balance = self.balance - amount
            emit TokensWithdrawn(amount: amount, from: self.owner?.address)
            return <-create Vault(balance: amount)
        }

        /// Deposit tokens into the vault
        /// @param from: The vault to deposit tokens from
        pub fun deposit(from: @FungibleToken.Vault) {
            let vault <- from as! @TokenRewards.Vault
            self.balance = self.balance + vault.balance
            emit TokensDeposited(amount: vault.balance, to: self.owner?.address)
            vault.balance = 0.0
            destroy vault
        }

        /// Get all supported metadata views for this resource
        pub fun getViews(): [Type] {
            return [Type<FungibleToken.VaultData>()]
        }

        /// Resolve a metadata view for this resource
        pub fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<FungibleToken.VaultData>():
                    return FungibleToken.VaultData(
                        storagePath: TokenRewards.VaultStoragePath,
                        receiverPath: TokenRewards.VaultPublicPath,
                        metadataPath: TokenRewards.VaultPublicPath,
                        providerPath: /private/tokenRewardsVault,
                        receiverLinkedType: Type<&TokenRewards.Vault{FungibleToken.Receiver}>(),
                        metadataLinkedType: Type<&TokenRewards.Vault{FungibleToken.Balance, MetadataViews.Resolver}>(),
                        providerLinkedType: Type<&TokenRewards.Vault{FungibleToken.Provider}>(),
                        createEmptyVaultFunction: (fun(): @FungibleToken.Vault {
                            return <-TokenRewards.createEmptyVault()
                        })
                    )
            }
            return nil
        }

        destroy() {
            if self.balance > 0.0 {
                TokenRewards.totalSupply = TokenRewards.totalSupply - self.balance
            }
        }
    }

    /// Create a new empty vault
    pub fun createEmptyVault(): @TokenRewards.Vault {
        return <-create Vault(balance: 0.0)
    }

    /// Minter resource allows creation of new tokens
    pub resource Minter {
        
        /// Mint new tokens and deposit them into a recipient's vault
        /// @param recipient: The vault to receive the minted tokens
        /// @param amount: Amount of tokens to mint
        /// @param reason: Reason for minting (e.g., "game_win", "achievement_unlock")
        pub fun mintTokens(recipient: &{FungibleToken.Receiver}, amount: UFix64, reason: String) {
            let mintedVault <- create Vault(balance: amount)
            TokenRewards.totalSupply = TokenRewards.totalSupply + amount
            
            emit RewardTokensMinted(
                amount: amount, 
                recipient: recipient.owner!.address, 
                reason: reason
            )
            
            recipient.deposit(from: <-mintedVault)
        }
    }

    /// Admin resource for contract management
    pub resource Administrator {
        
        /// Create a new minter resource
        pub fun createNewMinter(): @Minter {
            return <-create Minter()
        }

        /// Update the total supply (for emergency scenarios)
        pub fun updateTotalSupply(newSupply: UFix64) {
            TokenRewards.totalSupply = newSupply
        }
    }

    /// Get the token metadata
    pub fun getTokenMetadata(): {String: AnyStruct} {
        return {
            "name": "DeckZero Reward Token",
            "symbol": "DZRT",
            "decimals": 8,
            "description": "Reward tokens earned through DeckZero gaming platform achievements and victories",
            "website": "https://deckzero.eth",
            "totalSupply": self.totalSupply
        }
    }

    /// Check if an account has a vault set up
    pub fun isVaultSetup(address: Address): Bool {
        let account = getAccount(address)
        return account.getCapability<&TokenRewards.Vault{FungibleToken.Balance}>(TokenRewards.VaultPublicPath).check()
    }

    /// Get vault balance for an address
    pub fun getBalance(address: Address): UFix64 {
        let account = getAccount(address)
        let vaultRef = account.getCapability(TokenRewards.VaultPublicPath)
            .borrow<&TokenRewards.Vault{FungibleToken.Balance}>()
        
        return vaultRef?.balance ?? 0.0
    }

    init() {
        // Set initial supply to 0
        self.totalSupply = 0.0

        // Set storage paths
        self.VaultStoragePath = /storage/tokenRewardsVault
        self.VaultPublicPath = /public/tokenRewardsVault
        self.MinterStoragePath = /storage/tokenRewardsMinter
        self.AdminStoragePath = /storage/tokenRewardsAdmin

        // Create the admin resource and save it to storage
        let admin <- create Administrator()
        self.account.save(<-admin, to: self.AdminStoragePath)

        // Create a minter resource and save it to storage
        let minter <- create Minter()
        self.account.save(<-minter, to: self.MinterStoragePath)

        // Create an empty vault for the deployer
        let vault <- create Vault(balance: 0.0)
        self.account.save(<-vault, to: self.VaultStoragePath)

        // Create public capabilities
        self.account.link<&TokenRewards.Vault{FungibleToken.Receiver}>(
            self.VaultPublicPath,
            target: self.VaultStoragePath
        )

        self.account.link<&TokenRewards.Vault{FungibleToken.Balance, MetadataViews.Resolver}>(
            self.VaultPublicPath,
            target: self.VaultStoragePath
        )

        emit TokensInitialized(initialSupply: self.totalSupply)
    }
}