import NonFungibleToken from 0xf8d6e0586b0a20c7
import MetadataViews from 0xf8d6e0586b0a20c7

/// Simple GameRewards contract for Cadence 1.0
access(all) contract GameRewards: NonFungibleToken {
    
    access(all) var totalSupply: UInt64
    
    access(all) event ContractInitialized()
    access(all) event Withdraw(id: UInt64, from: Address?)
    access(all) event Deposit(id: UInt64, to: Address?)
    access(all) event RewardMinted(id: UInt64, recipient: Address, gameType: String, achievement: String)
    
    access(all) let CollectionStoragePath: StoragePath
    access(all) let CollectionPublicPath: PublicPath
    access(all) let MinterStoragePath: StoragePath
    
    access(all) resource NFT: NonFungibleToken.NFT, MetadataViews.Resolver {
        access(all) let id: UInt64
        access(all) let gameType: String
        access(all) let achievement: String
        access(all) let playerAddress: Address
        access(all) let timestamp: UFix64
        access(all) let gameSessionId: String
        
        init(
            id: UInt64,
            gameType: String,
            achievement: String,
            playerAddress: Address,
            gameSessionId: String
        ) {
            self.id = id
            self.gameType = gameType
            self.achievement = achievement
            self.playerAddress = playerAddress
            self.gameSessionId = gameSessionId
            self.timestamp = getCurrentBlock().timestamp
        }
        
        access(all) view fun getViews(): [Type] {
            return [Type<MetadataViews.Display>()]
        }
        
        access(all) fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<MetadataViews.Display>():
                    return MetadataViews.Display(
                        name: self.achievement,
                        description: "DeckZero Achievement: ".concat(self.achievement),
                        thumbnail: MetadataViews.HTTPFile(url: "https://deckzero.eth/nft/".concat(self.id.toString()))
                    )
            }
            return nil
        }
        
        access(all) fun createEmptyCollection(): @{NonFungibleToken.Collection} {
            return <-GameRewards.createEmptyCollection(nftType: Type<@GameRewards.NFT>())
        }
    }
    
    access(all) resource Collection: NonFungibleToken.Collection, MetadataViews.ResolverCollection {
        access(all) var ownedNFTs: @{UInt64: {NonFungibleToken.NFT}}
        
        init() {
            self.ownedNFTs <- {}
        }
        
        access(NonFungibleToken.Withdraw) fun withdraw(withdrawID: UInt64): @{NonFungibleToken.NFT} {
            let token <- self.ownedNFTs.remove(key: withdrawID) ?? panic("missing NFT")
            emit Withdraw(id: token.id, from: self.owner?.address)
            return <-token
        }
        
        access(all) fun deposit(token: @{NonFungibleToken.NFT}) {
            let token <- token as! @GameRewards.NFT
            let oldToken <- self.ownedNFTs[token.id] <- token
            emit Deposit(id: token.id, to: self.owner?.address)
            destroy oldToken
        }
        
        access(all) view fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }
        
        access(all) view fun borrowNFT(_ id: UInt64): &{NonFungibleToken.NFT}? {
            return &self.ownedNFTs[id]
        }
        
        access(all) view fun borrowViewResolver(id: UInt64): &{MetadataViews.Resolver}? {
            let nft = &self.ownedNFTs[id] as &{NonFungibleToken.NFT}?
            let gameReward = nft as! &GameRewards.NFT
            return gameReward
        }
        
        access(all) view fun getSupportedNFTTypes(): {Type: Bool} {
            return {Type<@GameRewards.NFT>(): true}
        }
        
        access(all) view fun isSupportedNFTType(type: Type): Bool {
            return type == Type<@GameRewards.NFT>()
        }
        
        access(all) fun createEmptyCollection(): @{NonFungibleToken.Collection} {
            return <-GameRewards.createEmptyCollection(nftType: Type<@GameRewards.NFT>())
        }
    }
    
    access(all) resource NFTMinter {
        access(all) fun mintNFT(
            recipient: &{NonFungibleToken.Collection},
            gameType: String,
            achievement: String,
            playerAddress: Address,
            gameSessionId: String
        ) {
            let newNFT <- create NFT(
                id: GameRewards.totalSupply,
                gameType: gameType,
                achievement: achievement,
                playerAddress: playerAddress,
                gameSessionId: gameSessionId
            )
            
            recipient.deposit(token: <-newNFT)
            
            emit RewardMinted(
                id: GameRewards.totalSupply,
                recipient: playerAddress,
                gameType: gameType,
                achievement: achievement
            )
            
            GameRewards.totalSupply = GameRewards.totalSupply + 1
        }
    }
    
    access(all) fun createEmptyCollection(nftType: Type): @{NonFungibleToken.Collection} {
        return <- create Collection()
    }
    
    init() {
        self.totalSupply = 0
        self.CollectionStoragePath = /storage/gameRewardsCollection
        self.CollectionPublicPath = /public/gameRewardsCollection
        self.MinterStoragePath = /storage/gameRewardsMinter
        
        let collection <- create Collection()
        self.account.storage.save(<-collection, to: self.CollectionStoragePath)
        
        let collectionCap = self.account.capabilities.storage.issue<&GameRewards.Collection>(
            self.CollectionStoragePath
        )
        self.account.capabilities.publish(collectionCap, at: self.CollectionPublicPath)
        
        let minter <- create NFTMinter()
        self.account.storage.save(<-minter, to: self.MinterStoragePath)
        
        emit ContractInitialized()
    }
}