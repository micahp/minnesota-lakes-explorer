// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/// @title Proof of Fish
/// @notice ERC-721 NFT representing immutable on-chain proof that a Minnesota lake
///         has verified fish populations according to DNR survey data.
/// @dev Each lake, identified by its DNR map_id (e.g. "11030500"), can be minted
///      exactly once by anyone. All metadata — lake name, county, species list,
///      survey dates, and a generated SVG image — is stored entirely on-chain.
///      Token IDs are derived from keccak256(map_id) for deterministic addressing.
///      Optimized for Base L2 deployment.
contract ProofOfFish is ERC721 {
    using Strings for uint256;

    // ──────────────────────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a lake receives its Proof of Fish NFT.
    /// @param tokenId  The token ID, derived from keccak256 of the map_id.
    /// @param mapId    The DNR map ID of the lake (e.g. "11030500").
    /// @param name     The name of the lake.
    /// @param county   The county where the lake is located.
    /// @param speciesCount  Number of distinct fish species documented.
    event LakeMinted(
        uint256 indexed tokenId,
        string  indexed mapId,
        string  name,
        string  county,
        uint256 speciesCount
    );

    // ──────────────────────────────────────────────────────────────
    // Data Structures
    // ──────────────────────────────────────────────────────────────

    /// @notice All on-chain metadata stored for a single lake's Proof of Fish.
    struct LakeData {
        string  mapId;            // DNR map ID (e.g. "11030500")
        string  name;             // Lake name
        string  county;           // County name
        string  speciesList;      // Comma-separated list of fish species
        uint256 speciesCount;     // Number of distinct species found
        string  firstSurveyDate;  // Date of the first survey on record
        string  lastSurveyDate;   // Date of the most recent survey
    }

    // ──────────────────────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────────────────────

    /// @notice Tracks whether a given map_id has already been minted.
    ///         Guarantees each lake can only ever be minted once.
    mapping(string => bool) private _mintedMapIds;

    /// @notice Maps a token ID back to its original DNR map_id string.
    mapping(uint256 => string) private _tokenToMapId;

    /// @notice Stores the full LakeData struct for each minted token.
    mapping(uint256 => LakeData) private _lakeData;

    // ──────────────────────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────────────────────

    /// @notice Initializes the Proof of Fish NFT collection.
    ///         Token name: "Proof of Fish", symbol: "POF".
    constructor() ERC721("Proof of Fish", "POF") {}

    // ──────────────────────────────────────────────────────────────
    // Minting
    // ──────────────────────────────────────────────────────────────

    /// @notice Mint a Proof of Fish NFT for a Minnesota lake.
    /// @dev Anyone may call this function at any time. Each lake, identified
    ///      by its unique map_id, can only be minted once. The caller pays
    ///      only the Base L2 gas cost — there is no mint fee.
    /// @param mapId            DNR map ID of the lake (e.g. "11030500").
    /// @param name             The name of the lake.
    /// @param county           The county where the lake is located.
    /// @param speciesList      Comma-separated list of fish species found.
    /// @param speciesCount     Total number of distinct fish species.
    /// @param firstSurveyDate  Date of the earliest fish survey on record.
    /// @param lastSurveyDate   Date of the most recent fish survey.
    function mint(
        string calldata mapId,
        string calldata name,
        string calldata county,
        string calldata speciesList,
        uint256 speciesCount,
        string calldata firstSurveyDate,
        string calldata lastSurveyDate
    )
        external
    {
        // ── Validation ──────────────────────────────────────────
        require(!_mintedMapIds[mapId], "ProofOfFish: lake already minted");
        require(bytes(mapId).length > 0,  "ProofOfFish: empty map ID");
        require(bytes(name).length > 0,   "ProofOfFish: empty name");

        // ── Derive deterministic token ID from map_id ───────────
        uint256 tokenId = uint256(keccak256(abi.encodePacked(mapId)));

        // ── Record that this lake has been minted ──────────────
        _mintedMapIds[mapId] = true;
        _tokenToMapId[tokenId] = mapId;

        _lakeData[tokenId] = LakeData({
            mapId:           mapId,
            name:            name,
            county:          county,
            speciesList:     speciesList,
            speciesCount:    speciesCount,
            firstSurveyDate: firstSurveyDate,
            lastSurveyDate:  lastSurveyDate
        });

        // ── Mint the NFT to the caller ─────────────────────────
        _safeMint(msg.sender, tokenId);

        emit LakeMinted(tokenId, mapId, name, county, speciesCount);
    }

    // ──────────────────────────────────────────────────────────────
    // Query Functions
    // ──────────────────────────────────────────────────────────────

    /// @notice Check whether a lake identified by its map_id has been minted.
    /// @param mapId  The DNR map ID to check.
    /// @return True if the lake has already received its Proof of Fish.
    function isMinted(string calldata mapId) external view returns (bool) {
        return _mintedMapIds[mapId];
    }

    /// @notice Retrieve all on-chain metadata for a given token.
    /// @param tokenId  The token ID to query.
    /// @return LakeData struct containing the full stored metadata.
    function getLakeData(uint256 tokenId)
        external
        view
        returns (LakeData memory)
    {
        _requireOwned(tokenId);
        return _lakeData[tokenId];
    }

    /// @notice Get the original DNR map ID for a given token.
    /// @param tokenId  The token ID to query.
    /// @return The map_id string (e.g. "11030500").
    function getMapId(uint256 tokenId)
        external
        view
        returns (string memory)
    {
        _requireOwned(tokenId);
        return _tokenToMapId[tokenId];
    }

    // ──────────────────────────────────────────────────────────────
    // ERC-721 Metadata — Fully On-Chain tokenURI
    // ──────────────────────────────────────────────────────────────

    /// @notice Returns a fully on-chain token URI as a base64-encoded data URI.
    /// @dev The returned URI contains complete JSON metadata conforming to the
    ///      ERC-721 Metadata Standard, including an on-chain generated SVG image.
    ///      Format: data:application/json;base64,<base64-encoded-json>
    /// @param tokenId  The token ID to generate the URI for.
    /// @return A data:application/json;base64,… URI string.
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        _requireOwned(tokenId);
        LakeData memory data = _lakeData[tokenId];

        string memory svg  = _generateSVG(data);
        string memory json = _buildMetadataJSON(data, svg);

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    // ──────────────────────────────────────────────────────────────
    // SVG Generation (internal)
    // ──────────────────────────────────────────────────────────────

    /// @notice Generates an on-chain SVG image for a lake.
    /// @dev The design features a night-time lake scene with layered blue water
    ///      waves, a crescent moon, scattered stars, and a stylized fish
    ///      silhouette. The lake name, county, species list, species count,
    ///      and map ID are rendered as text overlays.
    /// @param data  The lake metadata to render.
    /// @return SVG markup as a string.
    function _generateSVG(LakeData memory data)
        private
        pure
        returns (string memory)
    {
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg"',
            ' width="800" height="600" viewBox="0 0 800 600">',

            // ── Night sky background ─────────────────────────
            '<rect width="800" height="600" fill="#0a1628"/>',

            // ── Layered water (top → bottom, growing lighter) ─
            '<rect y="250" width="800" height="350" fill="#0f2b4a"/>',
            '<path d="M0,280 Q100,265 200,280 T400,280 T600,280 T800,280',
            ' L800,600 L0,600 Z" fill="#123b61"/>',
            '<path d="M0,320 Q100,305 200,320 T400,320 T600,320 T800,320',
            ' L800,600 L0,600 Z" fill="#1a5090"/>',
            '<path d="M0,380 Q100,365 200,380 T400,380 T600,380 T800,380',
            ' L800,600 L0,600 Z" fill="#1e6bc4"/>',
            '<path d="M0,460 Q100,445 200,460 T400,460 T600,460 T800,460',
            ' L800,600 L0,600 Z" fill="#3b82f6"/>',

            // ── Crescent moon ────────────────────────────────
            '<circle cx="650" cy="90" r="40" fill="#fde68a" opacity="0.85"/>',
            '<circle cx="665" cy="80" r="35" fill="#0a1628" opacity="0.35"/>',

            // ── Stars ────────────────────────────────────────
            '<circle cx="80"  cy="50"  r="2"   fill="white" opacity="0.8"/>',
            '<circle cx="180" cy="100" r="1.5" fill="white" opacity="0.6"/>',
            '<circle cx="300" cy="40"  r="2"   fill="white" opacity="0.7"/>',
            '<circle cx="450" cy="70"  r="1.5" fill="white" opacity="0.5"/>',
            '<circle cx="550" cy="30"  r="2"   fill="white" opacity="0.8"/>',
            '<circle cx="120" cy="140" r="1"   fill="white" opacity="0.4"/>',
            '<circle cx="750" cy="140" r="1.5" fill="white" opacity="0.6"/>',
            '<circle cx="400" cy="110" r="1"   fill="white" opacity="0.5"/>',
            '<circle cx="700" cy="50"  r="1.5" fill="white" opacity="0.4"/>',

            // ── Fish silhouette ──────────────────────────────
            '<g transform="translate(400, 360)">',
            '<ellipse cx="0" cy="0" rx="55" ry="22" fill="#60a5fa"',
            ' opacity="0.7"/>',
            '<polygon points="-55,-22 -80,0 -55,22" fill="#60a5fa"',
            ' opacity="0.7"/>',
            '<circle cx="30" cy="-6" r="5" fill="#0a1628"/>',
            '<circle cx="32" cy="-6" r="2" fill="white" opacity="0.3"/>',
            '</g>',

            // ── Header: "PROOF OF FISH" ──────────────────────
            '<text x="400" y="55" text-anchor="middle"',
            ' font-family="Arial,Helvetica,sans-serif"',
            ' font-size="26" fill="#60a5fa" font-weight="bold"',
            ' letter-spacing="3">PROOF OF FISH</text>',

            // ── Lake name ────────────────────────────────────
            '<text x="400" y="170" text-anchor="middle"',
            ' font-family="Arial,Helvetica,sans-serif"',
            ' font-size="38" fill="white" font-weight="bold">',
            _escapeXML(data.name),
            '</text>',

            // ── County ───────────────────────────────────────
            '<text x="400" y="212" text-anchor="middle"',
            ' font-family="Arial,Helvetica,sans-serif"',
            ' font-size="22" fill="#93c5fd">',
            _escapeXML(data.county),
            ' County, Minnesota</text>',

            // ── Divider line ─────────────────────────────────
            '<line x1="280" y1="235" x2="520" y2="235"',
            ' stroke="#3b82f6" stroke-width="2" opacity="0.4"/>',

            // ── Species count ────────────────────────────────
            '<text x="400" y="505" text-anchor="middle"',
            ' font-family="Arial,Helvetica,sans-serif"',
            ' font-size="30" fill="#fbbf24" font-weight="bold">',
            data.speciesCount.toString(),
            ' Species Documented</text>',

            // ── Species list ─────────────────────────────────
            '<text x="400" y="548" text-anchor="middle"',
            ' font-family="Arial,Helvetica,sans-serif"',
            ' font-size="15" fill="#bfdbfe">',
            _escapeXML(data.speciesList),
            '</text>',

            // ── Map ID footer ────────────────────────────────
            '<text x="400" y="585" text-anchor="middle"',
            ' font-family="Arial,Helvetica,sans-serif"',
            ' font-size="13" fill="#475569">Map ID: ',
            data.mapId,
            '</text>',

            '</svg>'
        ));
    }

    // ──────────────────────────────────────────────────────────────
    // JSON Metadata Builder (internal)
    // ──────────────────────────────────────────────────────────────

    /// @notice Builds a JSON metadata string conforming to the ERC-721
    ///         Metadata JSON Schema, including a base64-encoded SVG image.
    /// @param data  The lake metadata.
    /// @param svg   The raw SVG markup string.
    /// @return A JSON string containing name, description, image, and attributes.
    function _buildMetadataJSON(LakeData memory data, string memory svg)
        private
        pure
        returns (string memory)
    {
        // Base64-encode the SVG for embedding in the JSON "image" field.
        string memory encodedSVG = Base64.encode(bytes(svg));

        return string(abi.encodePacked(
            '{"name":"Proof of Fish: ',
            _escapeJSON(data.name),
            '","description":"On-chain proof that ',
            _escapeJSON(data.name),
            ' in ',
            _escapeJSON(data.county),
            ' County, Minnesota has verified fish populations.',
            ' ', data.speciesCount.toString(), ' species documented: ',
            _escapeJSON(data.speciesList),
            '. First survey: ', _escapeJSON(data.firstSurveyDate),
            '. Last survey: ', _escapeJSON(data.lastSurveyDate),
            '.","image":"data:image/svg+xml;base64,',
            encodedSVG,
            '","attributes":[',
            '{"trait_type":"County","value":"', _escapeJSON(data.county), '"},',
            '{"trait_type":"Species Count","display_type":"number","value":',
            data.speciesCount.toString(), '},',
            '{"trait_type":"First Survey","value":"',
            _escapeJSON(data.firstSurveyDate), '"},',
            '{"trait_type":"Last Survey","value":"',
            _escapeJSON(data.lastSurveyDate), '"},',
            '{"trait_type":"Map ID","value":"', data.mapId, '"},',
            '{"trait_type":"Species","value":"',
            _escapeJSON(data.speciesList), '"}',
            ']}'
        ));
    }

    // ──────────────────────────────────────────────────────────────
    // String Escaping Utilities (internal)
    // ──────────────────────────────────────────────────────────────

    /// @notice Escapes special XML / HTML characters for safe embedding in SVG.
    /// @dev Handles: & → &amp;   < → &lt;   > → &gt;
    ///                " → &quot;   ' → &apos;
    ///      If no characters need escaping the input is returned unchanged
    ///      to save gas.
    /// @param input  The raw string to escape.
    /// @return The XML-escaped string.
    function _escapeXML(string memory input)
        private
        pure
        returns (string memory)
    {
        bytes memory inputBytes = bytes(input);
        uint256 len = inputBytes.length;
        if (len == 0) return input;

        // First pass — count how many extra bytes are needed.
        uint256 extra = 0;
        for (uint256 i = 0; i < len; i++) {
            bytes1 c = inputBytes[i];
            if      (c == '&')  extra += 4;  // &amp;
            else if (c == '<')  extra += 3;  // &lt;
            else if (c == '>')  extra += 3;  // &gt;
            else if (c == '"')  extra += 5;  // &quot;
            else if (c == '\'') extra += 5;  // &apos;
        }

        // Short-circuit: nothing to escape.
        if (extra == 0) return input;

        // Second pass — build the escaped output.
        bytes memory output = new bytes(len + extra);
        uint256 j = 0;
        for (uint256 i = 0; i < len; i++) {
            bytes1 c = inputBytes[i];
            if (c == '&') {
                output[j++] = '&'; output[j++] = 'a'; output[j++] = 'm';
                output[j++] = 'p'; output[j++] = ';';
            } else if (c == '<') {
                output[j++] = '&'; output[j++] = 'l'; output[j++] = 't';
                output[j++] = ';';
            } else if (c == '>') {
                output[j++] = '&'; output[j++] = 'g'; output[j++] = 't';
                output[j++] = ';';
            } else if (c == '"') {
                output[j++] = '&'; output[j++] = 'q'; output[j++] = 'u';
                output[j++] = 'o'; output[j++] = 't'; output[j++] = ';';
            } else if (c == '\'') {
                output[j++] = '&'; output[j++] = 'a'; output[j++] = 'p';
                output[j++] = 'o'; output[j++] = 's'; output[j++] = ';';
            } else {
                output[j++] = c;
            }
        }
        return string(output);
    }

    /// @notice Escapes special JSON characters for safe embedding in JSON strings.
    /// @dev Handles: " → \"   \ → \\   and control characters (0x00–0x1F)
    ///      via \\u00XX escapes. Returns the input unchanged if nothing
    ///      needs escaping.
    /// @param input  The raw string to escape.
    /// @return The JSON-escaped string.
    function _escapeJSON(string memory input)
        private
        pure
        returns (string memory)
    {
        bytes memory inputBytes = bytes(input);
        uint256 len = inputBytes.length;
        if (len == 0) return input;

        // First pass — count how many extra bytes are needed.
        uint256 extra = 0;
        for (uint256 i = 0; i < len; i++) {
            bytes1 c = inputBytes[i];
            if (c == '"' || c == '\\') {
                extra += 1;          // prepend backslash
            } else if (c < 0x20) {
                extra += 5;          // \u00XX
            }
        }

        // Short-circuit: nothing to escape.
        if (extra == 0) return input;

        // Second pass — build the escaped output.
        bytes memory output = new bytes(len + extra);
        uint256 j = 0;
        for (uint256 i = 0; i < len; i++) {
            bytes1 c = inputBytes[i];
            if (c == '"') {
                output[j++] = '\\';
                output[j++] = '"';
            } else if (c == '\\') {
                output[j++] = '\\';
                output[j++] = '\\';
            } else if (c < 0x20) {
                uint8 charCode = uint8(c);
                output[j++] = '\\';
                output[j++] = 'u';
                output[j++] = '0';
                output[j++] = '0';
                output[j++] = _toHexDigit(charCode / 16);
                output[j++] = _toHexDigit(charCode % 16);
            } else {
                output[j++] = c;
            }
        }
        return string(output);
    }

    /// @notice Converts a uint8 value (0–15) to its uppercase hexadecimal
    ///         character ('0'–'9','A'–'F').
    /// @dev Internal helper used by _escapeJSON for \\u00XX encoding.
    /// @param value  The nibble value (0–15) to convert.
    /// @return A single byte containing the hex character.
    function _toHexDigit(uint8 value) private pure returns (bytes1) {
        // 0-9 → '0'-'9'   |   10-15 → 'A'-'F'
        if (value < 10) return bytes1(0x30 + value);
        return bytes1(0x41 + value - 10);
    }
}
