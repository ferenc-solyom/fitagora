package org.acme.webshop.domain

enum class Category(val displayName: String) {
    CARDIO("Cardio"),
    STRENGTH("Strength"),
    MOBILITY("Mobility"),
    RECOVERY("Recovery"),
    HOME_GYM("Home Gym"),
    ACCESSORIES("Accessories"),
    PLYOMETRICS("Plyometrics"),
    CORE("Core"),
    OUTDOOR("Outdoor/Functional"),
    OTHER("Other");

    companion object {
        fun fromString(value: String): Category? =
            entries.find { it.name.equals(value, ignoreCase = true) }
    }
}
