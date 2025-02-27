package com.example.carbonwise.ui.info

import android.graphics.BitmapFactory
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
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

        // Decode and set the image
        if (recommendation.imageBase64.isNotEmpty()) {
            val decodedBytes = Base64.decode(recommendation.imageBase64, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            holder.productImageView.setImageBitmap(bitmap)
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
