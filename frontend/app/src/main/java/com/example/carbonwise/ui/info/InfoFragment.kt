package com.example.carbonwise.ui.info

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.example.carbonwise.databinding.FragmentInfoBinding

class InfoFragment : Fragment() {

    private var _binding: FragmentInfoBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {

        _binding = FragmentInfoBinding.inflate(inflater, container, false)
        val root: View = binding.root

        // Dummy product info
        updateProductName("Test Product")
        updateEcoScore(76)
        updateCo2Info(getMockCo2Data())
        updateIngredientHighlights(getMockDangerousIngredients())

        return root
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun updateProductName(name: String?) {
        binding.productNameText.text = name ?: "Unknown Product"
    }

    private fun updateEcoScore(score: Int) {
        binding.ecoScoreText.text = "Eco Score: $score"
        val colorResId = when {
            score >= 75 -> android.R.color.holo_green_light
            score >= 50 -> android.R.color.holo_orange_light
            else -> android.R.color.holo_red_light
        }
        val color = ContextCompat.getColor(requireContext(), colorResId)
        binding.ecoScoreProgress.setIndicatorColor(color)

        binding.ecoScoreProgress.setProgress(score, true)
    }

    private fun updateCo2Info(data: Map<String, Double?>) {
        fun formatCo2(value: Double?): String {
            return if (value != null) String.format("%.2f kg CO₂e", value) else "N/A"
        }

        binding.co2Total.text = "Total CO₂: " + formatCo2(data["co2_total"])
        binding.co2Agriculture.text = "Agriculture: " + formatCo2(data["co2_agriculture"])
        binding.co2Packaging.text = "Packaging: " + formatCo2(data["co2_packaging"])
        binding.co2Transport.text = "Transport: " + formatCo2(data["co2_transportation"])
        binding.co2Processing.text = "Processing: " + formatCo2(data["co2_processing"])
    }

    private fun updateIngredientHighlights(dangerousIngredients: List<String>?) {
        val container = binding.ingredientListContainer
        container.removeAllViews()

        if (dangerousIngredients.isNullOrEmpty()) {
            val noIngredientsTextView = TextView(requireContext()).apply {
                text = "No harmful ingredients detected"
                textSize = 16f
                setTextColor(ContextCompat.getColor(requireContext(), android.R.color.black))
            }
            container.addView(noIngredientsTextView)
        } else {
            for (ingredient in dangerousIngredients) {
                val itemLayout = LinearLayout(requireContext()).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        setMargins(0, 8, 0, 8)
                    }
                    orientation = LinearLayout.HORIZONTAL
                    gravity = android.view.Gravity.CENTER_VERTICAL
                }

                val ingredientTextView = TextView(requireContext()).apply {
                    text = ingredient
                    textSize = 16f
                    setTextColor(ContextCompat.getColor(requireContext(), android.R.color.holo_red_dark))
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        marginStart = 8
                    }
                }

                itemLayout.addView(ingredientTextView)
                container.addView(itemLayout)
            }
        }
    }

    private fun getMockCo2Data(): Map<String, Double?> {
        return mapOf(
            "co2_total" to 0.91881158,
            "co2_agriculture" to 0.12445426,
            "co2_packaging" to 0.47782284,
            "co2_transportation" to 0.18547073,
            "co2_processing" to 0.11571353
        )
    }

    private fun getMockDangerousIngredients(): List<String>? {
        return listOf("High Fructose Corn Syrup", "Sodium Benzoate", "Artificial Colors")
    }
}
