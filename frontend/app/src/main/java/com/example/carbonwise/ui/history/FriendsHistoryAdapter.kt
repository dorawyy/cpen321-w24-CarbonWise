package com.example.carbonwise.ui.history

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.recyclerview.widget.RecyclerView
import com.example.carbonwise.databinding.ItemProductBinding
import com.example.carbonwise.network.HistoryItem
import com.example.carbonwise.network.ProductItem

class FriendsHistoryAdapter(
    private val onProductClick: (String) -> Unit,
    private val onReactClick: (String, String) -> Unit
) : RecyclerView.Adapter<FriendsHistoryAdapter.HistoryViewHolder>() {

    private var productList: List<ProductItem> = listOf()

    inner class HistoryViewHolder(private val binding: ItemProductBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(productItem: ProductItem) {
            val scanUuid = productItem.scan_uuid
            val productDetails = productItem.product
            val productId = productDetails?.productId

            binding.textProductName.text = productDetails?.productName ?: "Unknown Product"
            decodeBase64AndSetImage(productDetails?.productImage)

            binding.root.setOnClickListener {
                if (!productId.isNullOrEmpty()) {
                    onProductClick(productId)
                }
            }

            binding.reactionButtonsContainer.visibility = View.VISIBLE

            binding.btnPraise.setOnClickListener {
                if (!scanUuid.isNullOrEmpty()) {
                    onReactClick(scanUuid, "praise")
                    showToast("Praised ${productDetails?.productName}")
                } else {
                    showToast("Error: Missing scan_uuid")
                }
            }

            binding.btnShame.setOnClickListener {
                if (!scanUuid.isNullOrEmpty()) {
                    onReactClick(scanUuid, "shame")
                    showToast("Shamed ${productDetails?.productName}")
                } else {
                    showToast("Error: Missing scan_uuid")
                }
            }
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

        private fun showToast(message: String) {
            Toast.makeText(binding.root.context, message, Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HistoryViewHolder {
        val binding = ItemProductBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return HistoryViewHolder(binding)
    }

    override fun onBindViewHolder(holder: HistoryViewHolder, position: Int) {
        holder.bind(productList[position])
    }

    override fun getItemCount(): Int = productList.size

    fun submitList(historyItems: List<HistoryItem>) {
        productList = historyItems.flatMap { it.products }
        notifyDataSetChanged()
    }
}
