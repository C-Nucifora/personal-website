# Datacenter rows

Software, hardware and experience share the front equipment row. Every content rack has another cabinet on both sides. The camera starts close to the selected rack; repeated equipment behind that row provides the datacenter setting.

## References inspected

- [Google Data Centers, New Albany photo gallery](https://www.datacenters.google/discover-more/photo-gallery/). The exposed equipment, cabinet frames, suspended cable trays, structural crossmembers and white service lighting informed the geometry.
- [ENERGY STAR, hot aisle and cold aisle layout](https://www.energystar.gov/products/data_center_equipment/16-more-ways-cut-energy-waste-data-center/move-hot-aislecold-aisle-layout). Parallel rows and supply grilles informed the service aisles.

The geometry is original. Reference photographs are research material, not runtime assets. This is an illustrative portfolio environment, not an engineering layout or a replica of Google's installation.

## Construction

`datacenter.js` exports `createDatacenter({ floorY, rackHeight })`, returning `group`, `stats` and `dispose()`.

Its exported `RACK_SLOTS` registry names the Software, Hardware and Experience anchors. Both the room's reserved positions and the detailed scene models use those coordinates.

- The front row faces positive `z`. Interactive rack centres are `x = -6`, `0` and `6`, all at `z = 0`. Six ambient cabinets continue that row to `x = -24` and `24`.
- Front ambient cabinets match the interactive rack height of 10.4 units and its 4.92-unit width and 4.84-unit depth. Twenty-four rubber leveling pads and metal stems support their 0.22-unit floor clearance at all four corners. The cabinet-frame roofs align at `y = 5.2`; folded overlapping top covers sit 0.045 units higher. Closed cases, covered joins and narrow seams keep the row continuous.
- Three background rows sit at `z = -12`, `-24` and `-36`, each with nine ambient cabinets. These cabinets are 12.8 units tall, so their upper equipment and cable routes remain visible behind the focus row.
- Ambient cabinets use four deterministic equipment layouts. Compute cabinets mix 1U and 2U servers with segmented intake panels and blanking plates. Storage cabinets use wider 2U and 3U sleds with one or two rows of six drive handles. Networking cabinets alternate silver port banks, switches and dark horizontal cable managers, with blue patch leads routed into the side channel. Power cabinets put large UPS and battery blocks low in the rack, with distribution controls, a monitoring panel and broad blanking plates above. Column and row offsets mix these layouts across the foreground sides and all three background rows. The nearest left ambient cabinet is networking; the nearest right one is power. Painted grey, dark cabinet steel and exposed silver faces share the existing materials.
- Thirty-two cable-manager columns fill the 1.08-unit spaces between cabinets. Each cover leaves only a 0.02-unit assembly seam at either side and has a closed top.
- The raised floor uses broad three-unit seams and supply grilles with solid metal rims, raised slats and opaque recessed plenums. Cabinet sides have gasketed service joins and quarter-turn latches; front rail covers have hinges and mechanical handles. Overhead ladder trays, blue cable bundles, suspension rods and white service fixtures repeat across the room. Side walls and a far containment door close the background.
- Three fixed horizontal floor markers identify `01 SOFTWARE`, `02 HARDWARE` and `03 EXPERIENCE` in front of the content racks. Each five-unit-wide plane sits at `floorY + 0.018`, 0.01 units above the raised seams, with its centre at `z = 3.4`. Its 0.9375-unit depth fits between cabinet fronts and supply grilles. The lettering faces the foreground aisle and stays fixed when the camera moves. Off-white lettering, a copper index and a charcoal rectangular backing keep the words readable. Depth testing lets equipment occlude the markers during inspection. The HTML collection labels remain the accessible navigation.
- There are no green accents, blinking lights, bloom or fine perforation textures.

At the default dimensions, the environment has 33 ambient cabinets and eleven merged meshes and three floor-label planes totalling 82,626 triangles across fourteen draw calls. Bounds are `[-30, -5.66, -48]` to `[30, 11.48, 30]`. `stats.cabinetLayouts` records each ambient cabinet's archetype and occupied bay intervals. The module creates no lights, controls or raycast targets. Only the floor receives shadows. Cabinet steel and rubber pads cast shadows within the scene's existing shadow-camera bounds. Painted steel has low metallic response; exposed galvanized parts have higher metalness, while rubber stays matte. Floor-label canvases are 1280 by 240 pixels, use local IBM Plex Sans with Arial fallback, sRGB textures, linear filtering and generated mipmaps. Disposal releases every merged geometry, all three label geometries and textures, and every material, then clears the group.

## Camera and navigation

The scene places the three detailed rack models across the front row without rotating them. Every entry and reset uses the close active-rack framing. There is no entrance overview or aisle camera. Orbit, pan and zoom stay in the free foreground; the previous limits tied to the opposite cabinet bank have been removed.

Clicks on active equipment retain priority. Clicking a neighbouring content rack in the overview changes collection. Extraction, engraved project links and the second M1 sled extraction use the same local rack coordinates as before.
