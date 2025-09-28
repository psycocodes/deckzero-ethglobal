import NonFungibleToken from    /// The core resource that represents a GameRewards NFT
    access(all) resource NFT: NonFungibleToken.NFT, MetadataViews.Resolver {
        /// The unique ID for the NFT
        access(all) let id: UInt64
        
        /// Game-specific metadata
        access(all) let gameType: String
        access(all) let achievement: String
        access(all) let playerAddress: Address
        access(all) let timestamp: UFix64
        access(all) let gameSessionId: String
        access(all) let metadata: {String: AnyStruct}b0a20c7
import MetadataViews from 0xf8d6e0586b0a20c7
import ViewResolver from 0xf8d6e0586b0a20c7

/// GameRewards - NFT contract for DeckZero game achievements
///
access(all) contract GameRewards: NonFungibleToken, ViewResolver {

    /// Total supply of GameRewards NFTs in existence
    access(all) var totalSupply: UInt64

    /// Event emitted when the GameRewards contract is initialized
    access(all) event ContractInitialized()
    
    /// Event emitted when a GameRewards NFT is withdrawn
    access(all) event Withdraw(id: UInt64, from: Address?)
    
    /// Event emitted when a GameRewards NFT is deposited
    access(all) event Deposit(id: UInt64, to: Address?)

    /// Event emitted when a new GameRewards NFT is minted
    access(all) event RewardMinted(id: UInt64, recipient: Address, gameType: String, achievement: String)

    /// Storage and Public Paths
    access(all) let CollectionStoragePath: StoragePath
    access(all) let CollectionPublicPath: PublicPath
    access(all) let MinterStoragePath: StoragePath

    /// The core resource that represents a GameRewards NFT
    pub resource NFT: NonFungibleToken.INFT, MetadataViews.Resolver {
        /// The unique ID for the NFT
        pub let id: UInt64
        
        /// Game-specific metadata
        pub let gameType: String
        pub let achievement: String
        pub let playerAddress: Address
        pub let timestamp: UFix64
        pub let gameSessionId: String
        pub let metadata: {String: AnyStruct}

        init(
            id: UInt64,
            gameType: String,
            achievement: String,
            playerAddress: Address,
            gameSessionId: String,
            metadata: {String: AnyStruct}
        ) {
            self.id = id
            self.gameType = gameType
            self.achievement = achievement
            self.playerAddress = playerAddress
            self.timestamp = getCurrentBlock().timestamp
            self.gameSessionId = gameSessionId
            self.metadata = metadata
        }
        
        /// Function that returns all the Metadata Views implemented by a GameRewards NFT
        access(all) fun getViews(): [Type] {
            return [
                Type<MetadataViews.Display>(),
                Type<MetadataViews.Royalties>(),
                Type<MetadataViews.Editions>(),
                Type<MetadataViews.ExternalURL>(),
                Type<MetadataViews.NFTCollectionData>(),
                Type<MetadataViews.NFTCollectionDisplay>(),
                Type<MetadataViews.Serial>(),
                Type<MetadataViews.Traits>()
            ]
        }

        /// Function that resolves a metadata view for this NFT
        access(all) fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<MetadataViews.Display>():
                    return MetadataViews.Display(
                        name: self.achievement,
                        description: "DeckZero ".concat(self.gameType).concat(" Achievement: ").concat(self.achievement),
                        thumbnail: MetadataViews.HTTPFile(
                            url: "https://deckzero.eth/nft/".concat(self.id.toString())
                        )
                    )
                case Type<MetadataViews.Editions>():
                    let editionInfo = MetadataViews.EditionInfo(name: "DeckZero Achievements", number: self.id)
                    let editionList: [MetadataViews.EditionInfo] = [editionInfo]
                    return MetadataViews.Editions(
                        editionList
                    )
                case Type<MetadataViews.Serial>():
                    return MetadataViews.Serial(
                        self.id
                    )
                case Type<MetadataViews.Royalties>():
                    return MetadataViews.Royalties([])
                case Type<MetadataViews.ExternalURL>():
                    return MetadataViews.ExternalURL("https://deckzero.eth/nft/".concat(self.id.toString()))
                case Type<MetadataViews.NFTCollectionData>():
                    return MetadataViews.NFTCollectionData(
                        storagePath: GameRewards.CollectionStoragePath,
                        publicPath: GameRewards.CollectionPublicPath,
                        publicCollection: Type<&GameRewards.Collection>(),
                        publicLinkedType: Type<&GameRewards.Collection>(),
                        createEmptyCollectionFunction: (fun (): @{NonFungibleToken.Collection} {
                            return <-GameRewards.createEmptyCollection()
                        })
                    )
                case Type<MetadataViews.NFTCollectionDisplay>():
                    let media = MetadataViews.Media(
                        file: MetadataViews.HTTPFile(
                            url: "https://deckzero.eth/logo.png"
                        ),
                        mediaType: "image/png"
                    )
                    return MetadataViews.NFTCollectionDisplay(
                        name: "DeckZero Game Rewards",
                        description: "Achievement NFTs from DeckZero gaming platform",
                        externalURL: MetadataViews.ExternalURL("https://deckzero.eth"),
                        squareImage: media,
                        bannerImage: media,
                        socials: {
                            "twitter": MetadataViews.ExternalURL("https://twitter.com/deckzero")
                        }
                    )
                case Type<MetadataViews.Traits>():
                    let traits: [MetadataViews.Trait] = []
                    traits.append(MetadataViews.Trait(name: "gameType", value: self.gameType, displayType: "String", rarity: nil))
                    traits.append(MetadataViews.Trait(name: "achievement", value: self.achievement, displayType: "String", rarity: nil))
                    traits.append(MetadataViews.Trait(name: "gameSessionId", value: self.gameSessionId, displayType: "String", rarity: nil))
                    return MetadataViews.Traits(traits)
            }
            return nil
        }
    }

    /// Defines the methods that are particular to this NFT contract collection
    access(all) resource interface GameRewardsCollectionPublic {
        access(all) fun deposit(token: @{NonFungibleToken.NFT})
        access(all) fun getIDs(): [UInt64]
        access(all) fun borrowNFT(id: UInt64): &{NonFungibleToken.NFT}?
        access(all) fun borrowGameReward(id: UInt64): &GameRewards.NFT? {
            post {
                (result == nil) || (result?.id == id):
                    "Cannot borrow GameRewards reference: the ID of the returned reference is incorrect"
            }
        }
    }

    /// The resource that will be holding the NFTs inside any account
    access(all) resource Collection: GameRewardsCollectionPublic, NonFungibleToken.Collection, MetadataViews.ResolverCollection {
        // dictionary of NFT conforming tokens
        access(all) var ownedNFTs: @{UInt64: {NonFungibleToken.NFT}}

        init () {
            self.ownedNFTs <- {}
        }

        /// Removes an NFT from the collection and moves it to the caller
        pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
            let token <- self.ownedNFTs.remove(key: withdrawID) ?? panic("missing NFT")

            emit Withdraw(id: token.id, from: self.owner?.address)

            return <-token
        }

        /// Adds an NFT to the collections dictionary and adds the ID to the id array
        pub fun deposit(token: @NonFungibleToken.NFT) {
            let token <- token as! @GameRewards.NFT

            let id: UInt64 = token.id

            // add the new token to the dictionary which removes the old one
            let oldToken <- self.ownedNFTs[id] <- token

            emit Deposit(id: id, to: self.owner?.address)

            destroy oldToken
        }

        /// Helper method for getting the collection IDs
        pub fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        /// Gets a reference to an NFT in the collection so that 
        /// the caller can read its metadata and call its methods
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
            return (&self.ownedNFTs[id] as &NonFungibleToken.NFT?)!
        }
 
        /// Gets a reference to an NFT in the collection as a GameRewards NFT,
        /// This is safe as there are no functions that can be called on the GameRewards
        pub fun borrowGameReward(id: UInt64): &GameRewards.NFT? {
            if self.ownedNFTs[id] != nil {
                // Create an authorized reference to allow downcasting
                let ref = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
                return ref as! &GameRewards.NFT
            }

            return nil
        }

        /// Gets a reference to the NFT only conforming to the `{MetadataViews.Resolver}`
        /// interface so that the caller can retrieve the views that the NFT
        /// is implementing and resolve them
        pub fun borrowViewResolver(id: UInt64): &AnyResource{MetadataViews.Resolver} {
            let nft = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
            let gameReward = nft as! &GameRewards.NFT
            return gameReward as &AnyResource{MetadataViews.Resolver}
        }

        destroy() {
            destroy self.ownedNFTs
        }
    }

    /// Allows anyone to create a new empty collection
    pub fun createEmptyCollection(): @NonFungibleToken.Collection {
        return <- create Collection()
    }

    /// Resource that an admin or something similar would own to be
    /// able to mint new NFTs
    pub resource NFTMinter {

        /// Mints a new NFT with a new ID and deposit it in the
        /// recipients collection using their collection reference
        pub fun mintNFT(
            recipient: &{NonFungibleToken.CollectionPublic},
            gameType: String,
            achievement: String,
            playerAddress: Address,
            gameSessionId: String,
            metadata: {String: AnyStruct}
        ) {
            // create a new NFT
            var newNFT <- create NFT(
                id: GameRewards.totalSupply,
                gameType: gameType,
                achievement: achievement,
                playerAddress: playerAddress,
                gameSessionId: gameSessionId,
                metadata: metadata
            )

            // deposit it in the recipient's account using their reference
            recipient.deposit(token: <-newNFT)

            emit RewardMinted(
                id: GameRewards.totalSupply,
                recipient: playerAddress,
                gameType: gameType,
                achievement: achievement
            )

            GameRewards.totalSupply = GameRewards.totalSupply + UInt64(1)
        }
    }

    /// Function that resolves a metadata view for this contract
    pub fun resolveView(_ view: Type): AnyStruct? {
        switch view {
            case Type<MetadataViews.NFTCollectionData>():
                return MetadataViews.NFTCollectionData(
                    storagePath: GameRewards.CollectionStoragePath,
                    publicPath: GameRewards.CollectionPublicPath,
                    providerPath: /private/gameRewardsCollection,
                    publicCollection: Type<&GameRewards.Collection{GameRewards.GameRewardsCollectionPublic}>(),
                    publicLinkedType: Type<&GameRewards.Collection{GameRewards.GameRewardsCollectionPublic,NonFungibleToken.CollectionPublic,NonFungibleToken.Receiver,MetadataViews.ResolverCollection}>(),
                    providerLinkedType: Type<&GameRewards.Collection{GameRewards.GameRewardsCollectionPublic,NonFungibleToken.CollectionPublic,NonFungibleToken.Provider,MetadataViews.ResolverCollection}>(),
                    createEmptyCollectionFunction: (fun (): @NonFungibleToken.Collection {
                        return <-GameRewards.createEmptyCollection()
                    })
                )
            case Type<MetadataViews.NFTCollectionDisplay>():
                let media = MetadataViews.Media(
                    file: MetadataViews.HTTPFile(
                        url: "https://deckzero.eth/logo.png"
                    ),
                    mediaType: "image/png"
                )
                return MetadataViews.NFTCollectionDisplay(
                    name: "DeckZero Game Rewards",
                    description: "Achievement NFTs from DeckZero gaming platform",
                    externalURL: MetadataViews.ExternalURL("https://deckzero.eth"),
                    squareImage: media,
                    bannerImage: media,
                    socials: {
                        "twitter": MetadataViews.ExternalURL("https://twitter.com/deckzero")
                    }
                )
        }
        return nil
    }

    /// Function that returns all the Metadata Views implemented by a Non Fungible Token
    pub fun getViews(): [Type] {
        return [
            Type<MetadataViews.NFTCollectionData>(),
            Type<MetadataViews.NFTCollectionDisplay>()
        ]
    }

    init() {
        // Initialize the total supply
        self.totalSupply = 0

        // Set the named paths
        self.CollectionStoragePath = /storage/gameRewardsCollection
        self.CollectionPublicPath = /public/gameRewardsCollection
        self.MinterStoragePath = /storage/gameRewardsMinter

        // Create a Collection resource and save it to storage
        let collection <- create Collection()
        self.account.save(<-collection, to: self.CollectionStoragePath)

        // create a public capability for the collection
        self.account.link<&GameRewards.Collection{NonFungibleToken.CollectionPublic, GameRewards.GameRewardsCollectionPublic, MetadataViews.ResolverCollection}>(
            self.CollectionPublicPath,
            target: self.CollectionStoragePath
        )

        // Create a Minter resource and save it to storage
        let minter <- create NFTMinter()
        self.account.save(<-minter, to: self.MinterStoragePath)

        emit ContractInitialized()
    }
}