import FungibleToken from 0xf8d6e0586b0a20c7
import MetadataViews from 0xf8d6e0586b0a20c7

/// Simple TokenRewards contract for Cadence 1.0
access(all) contract TokenRewards: FungibleToken {
    
    access(all) var totalSupply: UFix64
    
    access(all) event TokensInitialized(initialSupply: UFix64)
    access(all) event TokensWithdrawn(amount: UFix64, from: Address?)
    access(all) event TokensDeposited(amount: UFix64, to: Address?)
    access(all) event RewardTokensMinted(amount: UFix64, recipient: Address, reason: String)
    
    access(all) let VaultStoragePath: StoragePath
    access(all) let VaultPublicPath: PublicPath
    access(all) let MinterStoragePath: StoragePath
    
    access(all) resource Vault: FungibleToken.Vault, MetadataViews.Resolver {
        access(all) var balance: UFix64
        
        init(balance: UFix64) {
            self.balance = balance
        }
        
        access(FungibleToken.Withdraw) fun withdraw(amount: UFix64): @{FungibleToken.Vault} {
            self.balance = self.balance - amount
            emit TokensWithdrawn(amount: amount, from: self.owner?.address)
            return <-create Vault(balance: amount)
        }
        
        access(all) fun deposit(from: @{FungibleToken.Vault}) {
            let vault <- from as! @TokenRewards.Vault
            self.balance = self.balance + vault.balance
            emit TokensDeposited(amount: vault.balance, to: self.owner?.address)
            vault.balance = 0.0
            destroy vault
        }
        
        access(all) view fun getViews(): [Type] {
            return []
        }
        
        access(all) fun resolveView(_ view: Type): AnyStruct? {
            return nil
        }
        
        access(all) fun createEmptyVault(): @{FungibleToken.Vault} {
            return <-TokenRewards.createEmptyVault(vaultType: Type<@TokenRewards.Vault>())
        }
        
        access(all) view fun isAvailableToWithdraw(amount: UFix64): Bool {
            return self.balance >= amount
        }
    }
    
    access(all) resource Minter {
        access(all) fun mintTokens(recipient: &{FungibleToken.Vault}, amount: UFix64, reason: String) {
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
    
    access(all) fun createEmptyVault(vaultType: Type): @{FungibleToken.Vault} {
        return <-create Vault(balance: 0.0)
    }
    
    init() {
        self.totalSupply = 0.0
        self.VaultStoragePath = /storage/tokenRewardsVault
        self.VaultPublicPath = /public/tokenRewardsVault
        self.MinterStoragePath = /storage/tokenRewardsMinter
        
        let minter <- create Minter()
        self.account.storage.save(<-minter, to: self.MinterStoragePath)
        
        let vault <- create Vault(balance: 0.0)
        self.account.storage.save(<-vault, to: self.VaultStoragePath)
        
        let vaultCap = self.account.capabilities.storage.issue<&TokenRewards.Vault>(
            self.VaultStoragePath
        )
        self.account.capabilities.publish(vaultCap, at: self.VaultPublicPath)
        
        emit TokensInitialized(initialSupply: self.totalSupply)
    }
}