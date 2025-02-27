package com.example.carbonwise.ui.info

import android.graphics.BitmapFactory
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.example.carbonwise.R

class RecommendationsAdapter(private val recommendations: List<Recommendation>) :
    RecyclerView.Adapter<RecommendationsAdapter.RecommendationViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecommendationViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_recommendation, parent, false)
        return RecommendationViewHolder(view)
    }

    override fun onBindViewHolder(holder: RecommendationViewHolder, position: Int) {
        val recommendation = recommendations[position]
        holder.productNameTextView.text = recommendation.productName
        holder.ecoScoreTextView.text = "Eco Score: ${recommendation.ecoScore}"

        val colorResId = when {
            recommendation.ecoScore >= 75 -> android.R.color.holo_green_light
            recommendation.ecoScore >= 50 -> android.R.color.holo_orange_light
            else -> android.R.color.holo_red_light
        }
        val color = ContextCompat.getColor(holder.itemView.context, colorResId)

        holder.ecoScoreTextView.setTextColor(color)

        // Decode Base64 image or use placeholder
        if (recommendation.imageBase64.isNotEmpty()) {
            val decodedBytes = Base64.decode(recommendation.imageBase64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            if (bitmap != null) {
                holder.productImageView.setImageBitmap(bitmap)
            } else {
                holder.productImageView.setImageResource(R.drawable.ic_placeholder)
            }
        }
    }


    override fun getItemCount(): Int {
        return recommendations.size
    }

    class RecommendationViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val productNameTextView: TextView = view.findViewById(R.id.productNameTextView)
        val ecoScoreTextView: TextView = view.findViewById(R.id.ecoScoreTextView)
        val productImageView: ImageView = view.findViewById(R.id.productImageView)
    }
}

data class Recommendation(
    val productName: String,
    val ecoScore: Int,
    val imageBase64: String
)
