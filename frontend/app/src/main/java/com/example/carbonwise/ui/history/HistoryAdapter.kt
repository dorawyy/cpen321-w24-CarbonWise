package com.example.carbonwise.ui.history

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.carbonwise.databinding.ItemProductBinding
import com.example.carbonwise.network.ProductDetails

class HistoryAdapter : RecyclerView.Adapter<HistoryAdapter.HistoryViewHolder>() {

    private var historyList: List<ProductDetails> = listOf()

    inner class HistoryViewHolder(private val binding: ItemProductBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(productDetails: ProductDetails) {
            binding.textProductName.text = productDetails.productName
            decodeBase64AndSetImage(productDetails.productImage)
        }

        private fun decodeBase64AndSetImage(base64String: String?) {
            if (base64String.isNullOrEmpty()) {
                binding.imageProduct.setImageResource(android.R.drawable.ic_menu_report_image)
            } else {
                try {
                    val decodedBytes = Base64.decode(base64String, Base64.DEFAULT)
                    val bitmap: Bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                    binding.imageProduct.setImageBitmap(bitmap)
                } catch (e: IllegalArgumentException) {
                    binding.imageProduct.setImageResource(android.R.drawable.ic_menu_report_image)
                }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HistoryViewHolder {
        val binding = ItemProductBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return HistoryViewHolder(binding)
    }

    override fun onBindViewHolder(holder: HistoryViewHolder, position: Int) {
        holder.bind(historyList[position])
    }

    override fun getItemCount(): Int {
        return historyList.size
    }

    fun submitList(list: List<ProductDetails>) {
        historyList = list.filter { !it.productName.isNullOrEmpty() }
        notifyDataSetChanged()
    }
}
