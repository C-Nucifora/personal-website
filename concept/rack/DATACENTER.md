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
- Front ambient cabinets match the interactive rack height of 10.4 units and its 4.92-unit width and 4.84-unit depth. Closed cases, covered joins and narrow seams keep the row continuous.
- Three background rows sit at `z = -12`, `-24` and `-36`, each with nine ambient cabinets. These cabinets are 12.8 units tall, so their upper equipment and cable routes remain visible behind the focus row.
- Thirty-two cable-manager columns fill the 1.08-unit spaces between cabinets. Each cover leaves only a 0.02-unit assembly seam at either side and has a closed top.
- The raised floor uses broad three-unit seams and supply grilles. Overhead ladder trays, blue cable bundles, suspension rods and white service fixtures repeat across the room. Side walls and a far containment door close the background.
- There are no green accents, blinking lights, bloom or fine perforation textures.

At the default dimensions, the environment has 33 ambient cabinets and ten merged meshes totalling 70,320 triangles. Bounds are `[-30, -5.66, -48]` to `[30, 11.48, 30]`. The module creates no lights, controls or raycast targets. Only the floor receives shadows. Disposal releases every merged geometry and material, then clears the group.

## Camera and navigation

The scene places the three detailed rack models across the front row without rotating them. Every entry and reset uses the close active-rack framing. There is no entrance overview or aisle camera. Orbit, pan and zoom stay in the free foreground; the previous limits tied to the opposite cabinet bank have been removed.

Clicks on active equipment retain priority. Clicking a neighbouring content rack in the overview changes collection. Extraction, engraved project links and the second M1 sled extraction use the same local rack coordinates as before.
